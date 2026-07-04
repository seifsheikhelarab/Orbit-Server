export interface ResumeSettings {
  template: "modern" | "professional" | "minimal";
  color: string;
  fontSize: "small" | "medium" | "large";
  lineSpacing: "compact" | "normal" | "relaxed";
  margin: "narrow" | "normal" | "wide";
}

export interface ResumeData {
  settings: ResumeSettings;
  basics: {
    name: string;
    label: string;
    email: string;
    phone: string;
    url: string;
    summary: string;
    location: string;
    profiles: { network: string; username: string; url: string }[];
  };
  work: {
    company: string;
    position: string;
    website?: string;
    startDate: string;
    endDate: string;
    summary?: string;
    highlights: string;
  }[];
  projects: {
    name: string;
    description: string;
    highlights: string;
    url: string;
    startDate: string;
    endDate: string;
  }[];
  volunteer: {
    organization: string;
    position: string;
    startDate: string;
    endDate: string;
    highlights: string;
  }[];
  education: {
    institution: string;
    area: string;
    studyType: string;
    startDate: string;
    endDate: string;
    score: string;
  }[];
  skills: {
    name: string;
    level: string;
    keywords: string;
  }[];
  languages: {
    name: string;
    fluency: string;
    highlights: string;
    startDate: string;
  }[];
  certifications: {
    name: string;
    issuer: string;
    startDate: string;
    endDate: string;
    url: string;
    highlights: string;
  }[];
}
