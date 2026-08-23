export interface CompanyDetails {
  name?: string
  industry?: string
  size?: string
  website?: string
  linkedin?: string
  instagram?: string
  twitter?: string
  facebook?: string
  address?: string
  about?: string
}

export interface ParsedFields {
  title?: string
  company?: string
  companyRefId?: string
  location?: string
  salary?: string
  description?: string
  postedAt?: string
  employmentType?: string
  experience?: string
  education?: string
  category?: string
  recruiter?: string
  skills?: string[]
  externalJobId?: string
  shareToken?: string
  companyDetails?: CompanyDetails
  closed?: boolean
}

export type JobSource = "GLINTS" | "JOBSTREET"
