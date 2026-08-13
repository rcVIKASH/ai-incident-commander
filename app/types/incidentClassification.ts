import {
  IncidentClassification,
  RawIncidentAlertInput,
} from "../validators/incidentClassification.validation.js";

/**
 * Interface representing the state of an incident during classification
 */
export interface IncidentClassificationState {
  /** Raw incoming incident payload */
  rawAlert: RawIncidentAlertInput;
  /** Resulting structured classification produced by AI */
  classification?: IncidentClassification;
  /** Current processing state */
  status: "PENDING" | "CLASSIFIED" | "FAILED";
  /** Error message if classification or validation failed */
  error?: string;
  /** ISO timestamp of when classification completed */
  classifiedAt?: string;
}
