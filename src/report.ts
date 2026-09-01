import type { Level } from './types.ts';

export type SanitizeReportDict = {
  modified: boolean;
  level: Level;
  javascript_in_names: number;
  embedded_files: number;
  open_action_removed: boolean;
  document_aa_removed: boolean;
  xfa_form_removed: boolean;
  calculation_order_removed: boolean;
  pages_with_aa: number;
  annotations_with_actions: number;
  annotation_action_types: string[];
  annotations_with_js: number;
  dangerous_uris_removed: number;
  dangerous_uri_schemes_removed: string[];
  file_size_before: number;
  file_size_after: number;
  error: string | null;
};

export type ScanReportDict = {
  has_javascript: boolean;
  has_open_action: boolean;
  has_document_aa: boolean;
  has_xfa_form: boolean;
  has_embedded_files: boolean;
  javascript_in_names: number;
  embedded_files_count: number;
  pages_with_aa: number;
  annotations_with_actions: number;
  annotation_action_types: string[];
  annotations_with_js: number;
  dangerous_uris: number;
  dangerous_uri_schemes: string[];
  page_count: number;
  is_encrypted: boolean;
  risk_level: 'none' | 'low' | 'medium' | 'high';
  file_size: number;
  error: string | null;
};

export class SanitizeReport {
  modified = false;
  level: Level = 'strict';
  javascript_in_names = 0;
  embedded_files = 0;
  open_action_removed = false;
  document_aa_removed = false;
  xfa_form_removed = false;
  calculation_order_removed = false;
  pages_with_aa = 0;
  annotations_with_actions = 0;
  annotation_action_types: string[] = [];
  annotations_with_js = 0;
  dangerous_uris_removed = 0;
  dangerous_uri_schemes_removed: string[] = [];
  file_size_before = 0;
  file_size_after = 0;
  error: string | null = null;

  asDict(): SanitizeReportDict {
    return {
      modified: this.modified,
      level: this.level,
      javascript_in_names: this.javascript_in_names,
      embedded_files: this.embedded_files,
      open_action_removed: this.open_action_removed,
      document_aa_removed: this.document_aa_removed,
      xfa_form_removed: this.xfa_form_removed,
      calculation_order_removed: this.calculation_order_removed,
      pages_with_aa: this.pages_with_aa,
      annotations_with_actions: this.annotations_with_actions,
      annotation_action_types: [...this.annotation_action_types],
      annotations_with_js: this.annotations_with_js,
      dangerous_uris_removed: this.dangerous_uris_removed,
      dangerous_uri_schemes_removed: [...this.dangerous_uri_schemes_removed],
      file_size_before: this.file_size_before,
      file_size_after: this.file_size_after,
      error: this.error,
    };
  }

  toJSON(): SanitizeReportDict {
    return this.asDict();
  }
}

export class ScanReport {
  has_javascript = false;
  has_open_action = false;
  has_document_aa = false;
  has_xfa_form = false;
  has_embedded_files = false;
  javascript_in_names = 0;
  embedded_files_count = 0;
  pages_with_aa = 0;
  annotations_with_actions = 0;
  annotation_action_types: string[] = [];
  annotations_with_js = 0;
  dangerous_uris = 0;
  dangerous_uri_schemes: string[] = [];
  page_count = 0;
  is_encrypted = false;
  risk_level: ScanReportDict['risk_level'] = 'none';
  file_size = 0;
  error: string | null = null;

  asDict(): ScanReportDict {
    return {
      has_javascript: this.has_javascript,
      has_open_action: this.has_open_action,
      has_document_aa: this.has_document_aa,
      has_xfa_form: this.has_xfa_form,
      has_embedded_files: this.has_embedded_files,
      javascript_in_names: this.javascript_in_names,
      embedded_files_count: this.embedded_files_count,
      pages_with_aa: this.pages_with_aa,
      annotations_with_actions: this.annotations_with_actions,
      annotation_action_types: [...this.annotation_action_types],
      annotations_with_js: this.annotations_with_js,
      dangerous_uris: this.dangerous_uris,
      dangerous_uri_schemes: [...this.dangerous_uri_schemes],
      page_count: this.page_count,
      is_encrypted: this.is_encrypted,
      risk_level: this.risk_level,
      file_size: this.file_size,
      error: this.error,
    };
  }

  toJSON(): ScanReportDict {
    return this.asDict();
  }
}

export function reportHasRemovals(report: SanitizeReport): boolean {
  return (
    report.javascript_in_names > 0 ||
    report.embedded_files > 0 ||
    report.open_action_removed ||
    report.document_aa_removed ||
    report.xfa_form_removed ||
    report.calculation_order_removed ||
    report.pages_with_aa > 0 ||
    report.annotations_with_actions > 0 ||
    report.annotations_with_js > 0 ||
    report.dangerous_uris_removed > 0
  );
}
