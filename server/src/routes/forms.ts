import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import prisma from '../config/database';
import { requireAuth } from '../middlewares/auth';
import { objectStorageClient } from '../../replit_integrations/object_storage';
import { randomUUID } from 'crypto';
import { UserRole, SubscriptionStatus } from '../generated/prisma';
import { getPlanConfig } from '../config/plans';

const router = Router();

interface FileUploadData {
  base64: string;
  mimeType: string;
  name?: string;
}

interface CreateFormRequest {
  insuranceCompany: string;
  formData: any;
  files?: FileUploadData[]; // Array de archivos para subir
  fileBase64?: string; // Mantener compatibilidad con versión anterior
  fileMimeType?: string;
  formId?: string; // Si se proporciona, actualiza un formulario existente
  ruleVersionId?: string; // ID de la versión de reglas usada para procesar
  originalScore?: number; // Score original al momento del procesamiento
}

function getPrivateObjectDir(): string {
  let dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) {
    throw new Error("PRIVATE_OBJECT_DIR not set");
  }
  if (dir.endsWith('/')) {
    dir = dir.slice(0, -1);
  }
  return dir;
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}

router.post(
  '/',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { insuranceCompany, formData, files, fileBase64, fileMimeType, formId, ruleVersionId, originalScore } = req.body as CreateFormRequest;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, rol: true, isActive: true, parentId: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (user.rol === UserRole.AUDITOR) {
      if (!user.isActive) {
        res.status(403).json({ error: 'Tu cuenta de auditor ha sido desactivada. Contacta a tu broker para más información.' });
        return;
      }

      if (user.parentId) {
        const brokerSubscription = await prisma.subscription.findFirst({
          where: {
            userId: user.parentId,
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (!brokerSubscription) {
          res.status(403).json({ error: 'El broker asociado a tu cuenta no tiene una suscripción activa.' });
          return;
        }

        const planConfig = getPlanConfig(brokerSubscription.planType);
        if (planConfig.maxAuditors === 0) {
          res.status(403).json({ error: 'El plan actual de tu broker no incluye auditores. No puedes procesar informes.' });
          return;
        }
      }
    }

    if (!insuranceCompany || !formData) {
      res.status(400).json({ error: 'Faltan campos requeridos: insuranceCompany y formData' });
      return;
    }

    try {
      const privateDir = getPrivateObjectDir();
      let isNewReport = false;
      
      // Normalizar archivos: soportar tanto el nuevo formato (files[]) como el legacy (fileBase64/fileMimeType)
      let filesToUpload: FileUploadData[] = [];
      if (files && files.length > 0) {
        filesToUpload = files;
      } else if (fileBase64 && fileMimeType) {
        // Compatibilidad con versión anterior
        filesToUpload = [{ base64: fileBase64, mimeType: fileMimeType }];
      }

      // Subir todos los archivos al Object Storage
      const uploadedFiles: { pdfUrl: string; fullPath: string }[] = [];
      
      for (const fileData of filesToUpload) {
        const objectId = randomUUID();
        const extension = fileData.mimeType === 'application/pdf' ? '.pdf' : 
                         fileData.mimeType.startsWith('image/') ? `.${fileData.mimeType.split('/')[1]}` : '';
        const entityPath = `uploads/${objectId}${extension}`;
        const fullPath = `${privateDir}/${entityPath}`;
        
        try {
          const { bucketName, objectName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          
          const binaryData = Buffer.from(fileData.base64, 'base64');
          
          await file.save(binaryData, {
            metadata: {
              contentType: fileData.mimeType,
            },
          });
          
          const pdfUrl = `/objects/${entityPath}`;
          uploadedFiles.push({ pdfUrl, fullPath });
          console.log('File uploaded to Object Storage:', pdfUrl);
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          // Limpiar archivos ya subidos en caso de error
          for (const uploaded of uploadedFiles) {
            try {
              const { bucketName, objectName } = parseObjectPath(uploaded.fullPath);
              const bucket = objectStorageClient.bucket(bucketName);
              const file = bucket.file(objectName);
              await file.delete();
            } catch (cleanupError) {
              console.error('Error cleaning up file:', cleanupError);
            }
          }
          res.status(500).json({ error: 'Error al subir los archivos' });
          return;
        }
      }

      // Obtener archivos antiguos ANTES de la transacción (para limpieza posterior)
      let oldPdfUrls: string[] = [];
      if (formId && uploadedFiles.length > 0) {
        const existingPdfs = await prisma.formPdf.findMany({
          where: { formId },
          select: { pdfUrl: true },
        });
        oldPdfUrls = existingPdfs.map(p => p.pdfUrl);
      }

      let medicalForm;
      try {
        medicalForm = await prisma.$transaction(async (tx) => {
          let form;
          
          // Si se proporciona formId, es una actualización de un formulario existente
          if (formId) {
            const existingForm = await tx.medicalForm.findFirst({
              where: { id: formId, userId },
            });
            
            if (!existingForm) {
              throw new Error('Formulario no encontrado');
            }
            
            const updateData: any = {
              formData,
              status: 'PENDING',
            };
            // Update rule version if provided (e.g., after recalculation)
            if (ruleVersionId) {
              updateData.ruleVersionId = ruleVersionId;
            }
            if (originalScore !== undefined) {
              updateData.originalScore = originalScore;
            }
            
            form = await tx.medicalForm.update({
              where: { id: formId },
              data: updateData,
            });
            isNewReport = false;
          } else {
            // Nuevo procesamiento: siempre crear un nuevo registro
            form = await tx.medicalForm.create({
              data: {
                userId,
                insuranceCompany,
                formData,
                status: 'PENDING',
                ruleVersionId: ruleVersionId ?? null,
                originalScore: originalScore ?? null,
              },
            });
            isNewReport = true;
          }

          // Guardar todos los archivos subidos
          if (uploadedFiles.length > 0) {
            if (formId) {
              // Actualización: eliminar registros antiguos de la BD
              await tx.formPdf.deleteMany({
                where: { formId: form.id },
              });
            }
            
            // Crear registros para todos los archivos
            for (const uploaded of uploadedFiles) {
              await tx.formPdf.create({
                data: {
                  formId: form.id,
                  pdfUrl: uploaded.pdfUrl,
                },
              });
            }
          }

          return form;
        });
      } catch (dbError: any) {
        console.error('Error in database transaction:', dbError);
        // Limpiar archivos huérfanos (los nuevos que se subieron)
        for (const uploaded of uploadedFiles) {
          try {
            const { bucketName, objectName } = parseObjectPath(uploaded.fullPath);
            const bucket = objectStorageClient.bucket(bucketName);
            const file = bucket.file(objectName);
            await file.delete();
            console.log('Cleaned up orphaned file after DB error:', uploaded.pdfUrl);
          } catch (cleanupError) {
            console.error('Error cleaning up orphaned file:', cleanupError);
          }
        }
        if (dbError.message === 'Formulario no encontrado') {
          res.status(404).json({ error: 'Formulario no encontrado' });
          return;
        }
        res.status(500).json({ error: 'Error al guardar el formulario' });
        return;
      }

      // DESPUÉS de transacción exitosa: limpiar archivos antiguos del Object Storage
      if (oldPdfUrls.length > 0) {
        for (const oldPdfUrl of oldPdfUrls) {
          if (oldPdfUrl && oldPdfUrl.startsWith('/objects/')) {
            try {
              const entityPath = oldPdfUrl.slice('/objects/'.length);
              const fullPath = `${privateDir}/${entityPath}`;
              const { bucketName, objectName } = parseObjectPath(fullPath);
              const bucket = objectStorageClient.bucket(bucketName);
              const file = bucket.file(objectName);
              const [exists] = await file.exists();
              if (exists) {
                await file.delete();
                console.log('Deleted old file from Object Storage:', oldPdfUrl);
              }
            } catch (deleteError) {
              console.error('Error deleting old file from Object Storage:', deleteError);
            }
          }
        }
      }

      res.status(201).json({
        success: true,
        formId: medicalForm.id,
        pdfUrls: uploadedFiles.map(f => f.pdfUrl),
        pdfUrl: uploadedFiles[0]?.pdfUrl || null, // Mantener compatibilidad
        isNew: isNewReport,
        message: 'Formulario guardado exitosamente',
        filesCount: uploadedFiles.length,
      });
    } catch (error) {
      console.error('Error creating medical form:', error);
      res.status(500).json({ error: 'Error al guardar el formulario' });
    }
  })
);

router.get(
  '/',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    try {
      const forms = await prisma.medicalForm.findMany({
        where: { userId },
        include: {
          formPdfs: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(forms);
    } catch (error) {
      console.error('Error fetching forms:', error);
      res.status(500).json({ error: 'Error al obtener formularios' });
    }
  })
);

router.get(
  '/reports',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.rol;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    try {
      // Obtener usuario actual con sus relaciones
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          children: {
            select: { id: true }
          }
        }
      });

      if (!currentUser) {
        res.status(401).json({ error: 'Usuario no encontrado' });
        return;
      }

      // Construir filtro según rol (RBAC)
      let whereCondition: any = {};

      switch (userRole) {
        case 'ADMIN':
          // ADMIN: ve todos los informes
          whereCondition = {};
          break;

        case 'ASEGURADORA':
          // ASEGURADORA: ve solo informes de su aseguradora
          // Los informes tienen insuranceCompany que debe coincidir con el código de la aseguradora
          if (currentUser.aseguradoraId) {
            const aseguradora = await prisma.aseguradoraConfig.findUnique({
              where: { id: currentUser.aseguradoraId }
            });
            if (aseguradora) {
              whereCondition = { insuranceCompany: aseguradora.codigo };
            }
          } else {
            // Si no tiene aseguradora asignada, no ve nada
            whereCondition = { id: 'none' };
          }
          break;

        case 'BROKER':
          // BROKER: ve sus propios informes + los de sus auditores (children)
          const brokerChildIds = currentUser.children?.map(c => c.id) || [];
          whereCondition = {
            userId: { in: [userId, ...brokerChildIds] }
          };
          break;

        case 'AUDITOR':
          // AUDITOR: solo ve sus propios informes
          whereCondition = { userId };
          break;

        default:
          // Por defecto, solo sus propios informes
          whereCondition = { userId };
      }
      
      const forms = await prisma.medicalForm.findMany({
        where: whereCondition,
        include: {
          formPdfs: true,
          user: {
            select: {
              id: true,
              nombre: true,
              email: true,
              rol: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const canSeeCreatorInfo = userRole === 'ADMIN' || userRole === 'ASEGURADORA' || userRole === 'BROKER';

      const reports = forms.map((form: any) => {
        const formData = form.formData || {};
        const identificacion = formData.identificacion || {};
        const patientName = [
          identificacion.nombres || '',
          identificacion.primer_apellido || '',
          identificacion.segundo_apellido || ''
        ].filter(Boolean).join(' ').trim() || 'Sin nombre';

        return {
          id: form.id,
          patientName,
          broker: form.insuranceCompany || 'Sin asignar',
          approvalScore: formData.score?.finalScore ?? 0,
          processedAt: form.createdAt,
          status: form.status,
          pdfUrl: form.formPdfs?.[0]?.pdfUrl || null, // Mantener compatibilidad
          pdfUrls: form.formPdfs?.map((pdf: any) => pdf.pdfUrl) || [], // Todos los archivos
          filesCount: form.formPdfs?.length || 0,
          userRole: userRole,
          ruleVersionId: form.ruleVersionId || null,
          originalScore: form.originalScore || null,
          creatorName: canSeeCreatorInfo ? (form.user?.nombre || 'Sin nombre') : null,
          creatorEmail: canSeeCreatorInfo ? (form.user?.email || '') : null,
        };
      });

      res.json(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ error: 'Error al obtener informes' });
    }
  })
);

router.get(
  '/:id',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.rol;
    const formId = req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    try {
      // Obtener usuario actual con sus relaciones para RBAC
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          children: {
            select: { id: true }
          }
        }
      });

      if (!currentUser) {
        res.status(401).json({ error: 'Usuario no encontrado' });
        return;
      }

      // Construir filtro según rol (RBAC) - misma lógica que /reports
      let whereCondition: any = { id: formId };

      switch (userRole) {
        case 'ADMIN':
          // ADMIN: puede ver cualquier informe
          // Solo necesita el ID
          break;

        case 'ASEGURADORA':
          // ASEGURADORA: solo puede ver informes de su aseguradora
          if (currentUser.aseguradoraId) {
            const aseguradora = await prisma.aseguradoraConfig.findUnique({
              where: { id: currentUser.aseguradoraId }
            });
            if (aseguradora) {
              whereCondition.insuranceCompany = aseguradora.codigo;
            } else {
              res.status(403).json({ error: 'No tienes permiso para ver este informe' });
              return;
            }
          } else {
            res.status(403).json({ error: 'No tienes permiso para ver este informe' });
            return;
          }
          break;

        case 'BROKER':
          // BROKER: puede ver sus propios informes + los de sus auditores
          const brokerChildIds = currentUser.children?.map(c => c.id) || [];
          whereCondition.userId = { in: [userId, ...brokerChildIds] };
          break;

        case 'AUDITOR':
        default:
          // AUDITOR y otros: solo sus propios informes
          whereCondition.userId = userId;
          break;
      }

      const form = await prisma.medicalForm.findFirst({
        where: whereCondition,
        include: {
          formPdfs: true,
        },
      });

      if (!form) {
        res.status(404).json({ error: 'Formulario no encontrado' });
        return;
      }

      res.json(form);
    } catch (error) {
      console.error('Error fetching form:', error);
      res.status(500).json({ error: 'Error al obtener formulario' });
    }
  })
);

router.delete(
  '/:id',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const formId = req.params.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    try {
      const form = await prisma.medicalForm.findFirst({
        where: { id: formId, userId },
        include: { formPdfs: true },
      });

      if (!form) {
        res.status(404).json({ error: 'Formulario no encontrado' });
        return;
      }

      for (const pdf of form.formPdfs) {
        if (pdf.pdfUrl && pdf.pdfUrl.startsWith('/objects/')) {
          try {
            const privateDir = getPrivateObjectDir();
            const entityPath = pdf.pdfUrl.slice('/objects/'.length);
            const fullPath = `${privateDir}/${entityPath}`;
            const { bucketName, objectName } = parseObjectPath(fullPath);
            const bucket = objectStorageClient.bucket(bucketName);
            const file = bucket.file(objectName);
            const [exists] = await file.exists();
            if (exists) {
              await file.delete();
              console.log('Deleted file from Object Storage:', pdf.pdfUrl);
            }
          } catch (deleteError) {
            console.error('Error deleting file from Object Storage:', deleteError);
          }
        }
      }

      await prisma.medicalForm.delete({
        where: { id: formId },
      });

      res.json({ success: true, message: 'Formulario eliminado' });
    } catch (error) {
      console.error('Error deleting form:', error);
      res.status(500).json({ error: 'Error al eliminar formulario' });
    }
  })
);

export default router;
