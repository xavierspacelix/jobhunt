export interface ParsedFields {
  title?: string
  company?: string
  location?: string
  salary?: string
  description?: string
  postedAt?: string
}

export type JobSource = "GLINTS" | "JOBSTREET"
