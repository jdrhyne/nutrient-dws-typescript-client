import type {
  FileInput,
  NutrientClientOptions,
  WorkflowInitialStage,
  WorkflowWithPartsStage,
  WorkflowWithActionsStage,
  WorkflowWithOutputStage,
  OutputTypeMap,
  TypedWorkflowResult,
  WorkflowDryRunResult,
  WorkflowExecuteOptions,
} from '../types';
import { WorkflowBuilder } from './workflow';
import type { components } from '../generated/api-types';

/**
 * Staged workflow builder that provides compile-time safety through TypeScript interfaces.
 * This wrapper ensures methods are only available at appropriate stages of the workflow.
 */
export class StagedWorkflowBuilder<TOutput extends keyof OutputTypeMap | undefined = undefined>
  implements
    WorkflowInitialStage,
    WorkflowWithPartsStage,
    WorkflowWithActionsStage,
    WorkflowWithOutputStage<TOutput>
{
  private builder: WorkflowBuilder<TOutput>;

  constructor(clientOptions: NutrientClientOptions) {
    this.builder = new WorkflowBuilder<TOutput>(clientOptions);
  }

  addFilePart(
    file: FileInput,
    options?: Omit<components['schemas']['FilePart'], 'file' | 'actions'>,
    actions?: components['schemas']['BuildAction'][],
  ): WorkflowWithPartsStage {
    this.builder.addFilePart(file, options, actions);
    return this;
  }

  addHtmlPart(
    html: FileInput,
    options?: Omit<components['schemas']['HTMLPart'], 'html' | 'actions'>,
    actions?: components['schemas']['BuildAction'][],
  ): WorkflowWithPartsStage {
    this.builder.addHtmlPart(html, options, actions);
    return this;
  }

  addNewPage(
    options?: Omit<components['schemas']['NewPagePart'], 'page' | 'actions'>,
    actions?: components['schemas']['BuildAction'][],
  ): WorkflowWithPartsStage {
    this.builder.addNewPage(options, actions);
    return this;
  }

  addDocumentPart(
    documentId: string,
    options?: Omit<components['schemas']['DocumentPart'], 'document' | 'actions'> & {
      layer?: string;
    },
    actions?: components['schemas']['BuildAction'][],
  ): WorkflowWithPartsStage {
    this.builder.addDocumentPart(documentId, options, actions);
    return this;
  }

  // Action methods
  applyActions(actions: components['schemas']['BuildAction'][]): WorkflowWithActionsStage {
    this.builder.applyActions(actions);
    return this;
  }

  applyAction(action: components['schemas']['BuildAction']): WorkflowWithActionsStage {
    this.builder.applyAction(action);
    return this;
  }

  // Output methods
  outputPdf(
    options?: Omit<components['schemas']['PDFOutput'], 'type'>,
  ): WorkflowWithOutputStage<'pdf'> {
    this.builder.outputPdf(options);
    return this as WorkflowWithOutputStage<'pdf'>;
  }

  outputPdfA(
    options?: Omit<components['schemas']['PDFAOutput'], 'type'>,
  ): WorkflowWithOutputStage<'pdfa'> {
    this.builder.outputPdfA(options);
    return this as WorkflowWithOutputStage<'pdfa'>;
  }

  outputPdfUA(
    options?: Omit<components['schemas']['PDFAOutput'], 'type'>,
  ): WorkflowWithOutputStage<'pdfua'> {
    this.builder.outputPdfUa(options);
    return this as WorkflowWithOutputStage<'pdfua'>;
  }

  outputImage<T extends 'png' | 'jpeg' | 'jpg' | 'webp'>(
    format: T,
    options?: Omit<components['schemas']['ImageOutput'], 'type' | 'format'>,
  ): WorkflowWithOutputStage<T> {
    this.builder.outputImage(format, options);
    return this as unknown as WorkflowWithOutputStage<T>;
  }

  outputOffice<T extends 'docx' | 'xlsx' | 'pptx'>(format: T): WorkflowWithOutputStage<T> {
    this.builder.outputOffice(format);
    return this as unknown as WorkflowWithOutputStage<T>;
  }

  outputHtml(
    options?: Omit<components['schemas']['HTMLOutput'], 'type'>,
  ): WorkflowWithOutputStage<'html'> {
    this.builder.outputHtml(options);
    return this as WorkflowWithOutputStage<'html'>;
  }

  outputMarkdown(
    options?: Omit<components['schemas']['MarkdownOutput'], 'type'>,
  ): WorkflowWithOutputStage<'markdown'> {
    this.builder.outputMarkdown(options);
    return this as WorkflowWithOutputStage<'markdown'>;
  }

  outputJson(
    options?: Omit<components['schemas']['JSONContentOutput'], 'type'>,
  ): WorkflowWithOutputStage<'json-content'> {
    this.builder.outputJson(options);
    return this as WorkflowWithOutputStage<'json-content'>;
  }

  // Execution methods
  execute(options?: WorkflowExecuteOptions): Promise<TypedWorkflowResult<TOutput>> {
    return this.builder.execute(options);
  }

  dryRun(options?: Pick<WorkflowExecuteOptions, 'timeout'>): Promise<WorkflowDryRunResult> {
    return this.builder.dryRun(options);
  }
}
