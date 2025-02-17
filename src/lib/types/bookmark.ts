export interface Bookmark {
  id: string;
  text: string;
  explanation: string;
  createdAt: any; // You can make this more specific like Date or FirebaseTimestamp
  userId: string;
} 