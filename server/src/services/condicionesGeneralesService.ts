import prisma from '../config/database';
import { CondicionesGeneralesData } from '../../../types/policy-types';

export const condicionesGeneralesService = {
  async list(aseguradoraCodigo?: string) {
    const where: any = {};
    if (aseguradoraCodigo) {
      where.aseguradoraCodigo = aseguradoraCodigo;
    }
    return prisma.condicionesGenerales.findMany({
      where,
      orderBy: [{ aseguradoraCodigo: 'asc' }, { productName: 'asc' }, { createdAt: 'desc' }],
    });
  },

  async getById(id: string) {
    return prisma.condicionesGenerales.findUnique({ where: { id } });
  },

  async create(data: {
    aseguradoraCodigo: string;
    productName: string;
    version: string;
    conditionsData: CondicionesGeneralesData;
    sourceDocumentUrl?: string;
    extractionRawResponse?: any;
    notes?: string;
    createdBy?: string;
  }) {
    return prisma.condicionesGenerales.create({
      data: {
        aseguradoraCodigo: data.aseguradoraCodigo,
        productName: data.productName,
        version: data.version,
        conditionsData: data.conditionsData as any,
        sourceDocumentUrl: data.sourceDocumentUrl,
        extractionRawResponse: data.extractionRawResponse,
        notes: data.notes,
        createdBy: data.createdBy,
      },
    });
  },

  async update(id: string, data: {
    conditionsData?: CondicionesGeneralesData;
    notes?: string;
    isActive?: boolean;
  }) {
    const updateData: any = {};
    if (data.conditionsData !== undefined) updateData.conditionsData = data.conditionsData;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return prisma.condicionesGenerales.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(id: string) {
    return prisma.condicionesGenerales.delete({ where: { id } });
  },

  async findByProduct(aseguradoraCodigo: string, productName: string) {
    return prisma.condicionesGenerales.findMany({
      where: {
        aseguradoraCodigo,
        productName,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
