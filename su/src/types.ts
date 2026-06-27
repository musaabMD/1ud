export type Exam = { title: string; role: string };

export type StudyItem = {
  id: string;
  kind: "file" | "text" | "link";
  name: string;
  meta: string;
  progress: number;
  persisted?: boolean;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
