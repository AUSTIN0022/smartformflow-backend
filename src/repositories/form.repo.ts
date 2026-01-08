import { Form, FormField, FormStep, } from "@prisma/client";
import { FormInput } from "../validators/form.schema";
import { prisma } from "../config/db";

export type FormWithDetails = Form & {
    steps: (FormStep & {
        fields: FormField[];
    })[];
    fields?: FormField[];
};

export interface IFormRepository {
    createForm(eventId: string, data: FormInput): Promise<FormWithDetails>;
    upsertForm(eventId: string, data: FormInput): Promise<FormWithDetails>;
    findById(id: string): Promise<FormWithDetails | null>;
    findByEventId(eventId: string): Promise<FormWithDetails | null>;
    findBySlug(slug: string): Promise<FormWithDetails | null>;
    deleteForm(id: string): Promise<void>; 
    publishForm(id: string): Promise<FormWithDetails>;
}


export class FormRepositories implements IFormRepository {
  private readonly includeDetails = {
    steps: {
      include: {
        fields: { orderBy: { order: "asc" as const } },
      },
      orderBy: { stepNumber: "asc" as const },
    },
    fields: {
      where: { stepId: null },
      orderBy: { order: "asc" as const },
    },
  };

  private mapFieldData(fields: any[]) {
    return fields.map((field) => ({
      key: field.key,
      type: field.type,
      label: field.label,
      required: field.required ?? false,
      order: field.order,
      validation: field.validation ?? {},
      options: field.options ?? {},
    }));
  }

  async createForm(eventId: string, data: FormInput): Promise<FormWithDetails> {
    const form = await prisma.form.create({
      data: {
        eventId,
        isMultiStep: data.isMultiStep ?? false,
        settings: data.settings ?? {},
        ...(data.isMultiStep && data.steps && {
          steps: {
            create: data.steps.map((step) => ({
              stepNumber: step.stepNumber,
              title: step.title,
              description: step.description ?? null,
              fields: { create: this.mapFieldData(step.fields) },
            })),
          },
        }),
        ...(!data.isMultiStep && data.fields && {
          fields: { create: this.mapFieldData(data.fields) },
        }),
      },
      include: this.includeDetails,
    });
    return form as FormWithDetails;
  }

  async upsertForm(eventId: string, data: FormInput): Promise<FormWithDetails> {
    return await prisma.$transaction(async (tx) => {
      const existingForm = await tx.form.findUnique({ where: { eventId } });

      if (existingForm) {
        // Clean up old structure to prevent duplicates or orphaned fields
        await tx.formField.deleteMany({ where: { formId: existingForm.id } });
        await tx.formStep.deleteMany({ where: { formId: existingForm.id } });
      }

      // Preparation of nested data for both create and update
      const nestedData = {
        isMultiStep: data.isMultiStep ?? false,
        settings: data.settings ?? {},
        ...(data.isMultiStep && data.steps && {
          steps: {
            create: data.steps.map((step) => ({
              stepNumber: step.stepNumber,
              title: step.title,
              description: step.description ?? null,
              fields: { create: this.mapFieldData(step.fields) },
            })),
          },
        }),
        ...(!data.isMultiStep && data.fields && {
          fields: { create: this.mapFieldData(data.fields) },
        }),
      };

      const form = await tx.form.upsert({
        where: { eventId },
        update: nestedData,
        create: { eventId, ...nestedData },
        include: this.includeDetails,
      });

      return form as FormWithDetails;
    });
  }

  async findById(id: string): Promise<FormWithDetails | null> {
    const form = await prisma.form.findUnique({
      where: { id },
      include: this.includeDetails,
    });

    return form as FormWithDetails | null;
  }

  async findByEventId(eventId: string): Promise<FormWithDetails | null> {
    const form = await prisma.form.findUnique({
      where: { eventId },
      include: this.includeDetails,
    });

    return form as FormWithDetails | null;
  }

  async findBySlug(slug: string): Promise<FormWithDetails | null> {
    const event = await prisma.event.findUnique({
      where: { slug },
      include: { form: { include: this.includeDetails } },
    });

    return (event?.form as FormWithDetails) || null;
  }
  async publishForm(id: string): Promise<FormWithDetails> {

    const form = await prisma.form.update({
        where: { id },
        data: { publishedAt:  new Date() },
        include: this.includeDetails,
    });

    return form as FormWithDetails;
  }

  async deleteForm(id: string): Promise<void> {
     await prisma.form.update({ 
        where: { id },
        data: { isDeleted: true },
    });
  }
}
