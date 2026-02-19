import prisma from '../config/database';
import { PatientPolicyData } from '../../../types/policy-types';

export const patientPolicyService = {
  async getById(id: string) {
    return prisma.patientPolicy.findUnique({ where: { id } });
  },

  async getByMedicalForm(medicalFormId: string) {
    return prisma.patientPolicy.findMany({
      where: { medicalFormId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: {
    userId: string;
    aseguradoraCodigo: string;
    policyData: PatientPolicyData;
    medicalFormId?: string;
    policyNumber?: string;
    documentUrls?: string[];
    extractionRawResponse?: any;
  }) {
    return prisma.patientPolicy.create({
      data: {
        userId: data.userId,
        aseguradoraCodigo: data.aseguradoraCodigo,
        policyData: data.policyData as any,
        medicalFormId: data.medicalFormId,
        policyNumber: data.policyNumber || data.policyData.numero_poliza,
        documentUrls: data.documentUrls || [],
        extractionRawResponse: data.extractionRawResponse,
      },
    });
  },

  async update(id: string, data: {
    policyData?: PatientPolicyData;
    medicalFormId?: string;
  }) {
    const updateData: any = {};
    if (data.policyData !== undefined) {
      updateData.policyData = data.policyData;
      if (data.policyData.numero_poliza) {
        updateData.policyNumber = data.policyData.numero_poliza;
      }
    }
    if (data.medicalFormId !== undefined) updateData.medicalFormId = data.medicalFormId;

    return prisma.patientPolicy.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(id: string) {
    return prisma.patientPolicy.delete({ where: { id } });
  },
};
