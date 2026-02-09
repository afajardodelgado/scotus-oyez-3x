export interface OyezCaseListItem {
  ID: number;
  name: string;
  citation: {
    volume: string;
    page: string | null;
    year: string;
  };
  term: string;
  docket_number: string;
  description: string;
  justia_url: string;
  href: string;
  question: string;
  timeline: OyezTimeline[];
}

export interface OyezCase {
  ID: number;
  name: string;
  citation: {
    volume: string;
    page: string | null;
    year: string;
  };
  term: string;
  first_party: string;
  second_party: string;
  docket_number: string;
  decision_date: string;
  description: string;
  justia_url: string;
  href: string;
  facts_of_the_case: string;
  question: string;
  conclusion: string;
  advocates: OyezAdvocate[];
  decisions: OyezDecision[];
  written_opinion: OyezWrittenOpinion[];
  timeline: OyezTimeline[];
}

export interface OyezAdvocate {
  advocate_description: string;
  advocate: {
    name: string;
    href: string;
  };
}

export interface OyezDecision {
  votes: OyezVote[];
  majority_vote: number;
  minority_vote: number;
  winning_party: string;
  decision_type: string;
  description: string;
}

export interface OyezVote {
  member: {
    name: string;
    href: string;
    last_name: string;
  };
  vote: string;
  opinion_type: string;
  joining: { name: string; href: string }[];
}

export interface OyezWrittenOpinion {
  id: number;
  title: string;
  type: {
    value: string;
    label: string;
  };
  justia_opinion_id: number | null;
  justia_opinion_url: string | null;
  judge_full_name: string | null;
  judge_last_name: string | null;
}

export interface OyezTimeline {
  event: string;
  dates: number[];
}

export interface CaseSummary {
  id: string;
  name: string;
  firstParty: string;
  secondParty: string;
  docketNumber: string;
  term: string;
  decisionDate: string | null;
  decisionTimestamp: number | null;
  majorityVotes: number;
  minorityVotes: number;
  isDecided: boolean;
  decisionType: string;
  description: string;
  href: string;
}
