// Client-safe shapes returned by the API — deliberately separate from the
// Prisma models so the browser bundle never has a reason to import
// anything from `@prisma/client`.

export interface TagDTO {
  id: string;
  name: string;
  color: string;
}

export interface NoteDTO {
  id: string;
  title: string;
  body: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  tags: TagDTO[];
}
