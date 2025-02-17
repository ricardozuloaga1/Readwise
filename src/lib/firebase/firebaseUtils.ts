import { auth, db, storage } from "./firebase";
import {
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Auth functions
export const logoutUser = () => signOut(auth);

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Firestore functions
export const addDocument = (collectionName: string, data: any) =>
  addDoc(collection(db, collectionName), data);

export const getDocuments = async (collectionName: string) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateDocument = (collectionName: string, id: string, data: any) =>
  updateDoc(doc(db, collectionName, id), data);

export const deleteDocument = (collectionName: string, id: string) =>
  deleteDoc(doc(db, collectionName, id));

// Storage functions
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// Add these functions to handle bookmarks
export const addBookmark = async (userId: string, text: string, explanation: string) => {
  try {
    console.log('Starting to add bookmark to Firebase...', { userId, text, explanation });
    
    // Check if Firebase is initialized
    if (!db) {
      console.error('Firestore is not initialized!');
      throw new Error('Firestore is not initialized');
    }

    // Create the bookmark data
    const bookmarkData = {
      userId,
      text,
      explanation,
      createdAt: serverTimestamp(),
    };
    console.log('Bookmark data to be added:', bookmarkData);

    // Add to Firestore
    const bookmarkRef = await addDoc(collection(db, 'bookmarks'), bookmarkData);
    console.log('Bookmark added successfully with ID:', bookmarkRef.id);
    return bookmarkRef.id;
  } catch (error) {
    console.error('Error adding bookmark:', error);
    // Log the full error details
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    throw error;
  }
};

export const getBookmarks = async (userId: string) => {
  try {
    console.log('Starting to fetch bookmarks for user:', userId);
    
    if (!db) {
      console.error('Firestore is not initialized!');
      throw new Error('Firestore is not initialized');
    }

    const bookmarksRef = collection(db, 'bookmarks');
    
    // Restore the orderBy now that the index is created
    const q = query(
      bookmarksRef, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    console.log('Got query snapshot, size:', querySnapshot.size);

    const bookmarks = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('Retrieved bookmarks:', bookmarks);
    return bookmarks;
  } catch (error) {
    console.error('Error getting bookmarks:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    throw error;
  }
};

export const removeBookmark = async (userId: string, bookmarkId: string) => {
  try {
    console.log('Removing bookmark...', { userId, bookmarkId });
    await deleteDoc(doc(db, 'bookmarks', bookmarkId));
    console.log('Bookmark removed successfully');
  } catch (error) {
    console.error('Error removing bookmark:', error);
    throw error;
  }
};

export const checkIfBookmarked = async (userId: string, text: string) => {
  try {
    const bookmarksRef = collection(db, 'bookmarks');
    const q = query(
      bookmarksRef,
      where('userId', '==', userId),
      where('text', '==', text)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.length > 0 ? querySnapshot.docs[0].id : null;
  } catch (error) {
    console.error('Error checking bookmark:', error);
    throw error;
  }
};

// Add these interfaces
interface QuizResult {
  id?: string;
  userId: string;
  mainTopic: string;
  totalQuestions: number;
  correctAnswers: number;
  timestamp?: any;
  questions: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
}

// Add these functions
export const saveQuizResult = async (quizResult: QuizResult) => {
  try {
    console.log('Saving quiz result:', quizResult);
    const now = serverTimestamp();
    const quizRef = await addDoc(collection(db, 'quizResults'), {
      ...quizResult,
      timestamp: now,
      createdAt: now
    });
    console.log('Quiz result saved with ID:', quizRef.id);
    return quizRef.id;
  } catch (error) {
    console.error('Error saving quiz result:', error);
    throw error;
  }
};

export const getUserProgress = async (userId: string) => {
  try {
    console.log('Getting progress for user:', userId);
    
    // Get quiz results with proper ordering
    const quizQuery = query(
      collection(db, 'quizResults'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc') // Change to createdAt since it might be more reliable
    );
    
    try {
      const quizSnapshot = await getDocs(quizQuery);
      console.log('Quiz snapshot size:', quizSnapshot.size);
      
      const quizResults = quizSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.createdAt?.toDate() || data.timestamp?.toDate() || new Date()
        };
      });
      
      console.log('Processed quiz results:', quizResults);

      // Get bookmarks count
      const bookmarksQuery = query(
        collection(db, 'bookmarks'),
        where('userId', '==', userId)
      );
      const bookmarksSnapshot = await getDocs(bookmarksQuery);
      
      const progress = {
        quizResults,
        totalQuizzes: quizResults.length,
        averageScore: quizResults.length > 0 
          ? quizResults.reduce((acc, curr) => 
              acc + (curr.correctAnswers / curr.totalQuestions), 0) / quizResults.length
          : 0,
        totalBookmarks: bookmarksSnapshot.size,
        recentTopics: quizResults.slice(0, 5).map(r => r.mainTopic)
      };

      console.log('Calculated progress:', progress);
      return progress;
    } catch (error) {
      // If the index error occurs, try without ordering
      if (error instanceof Error && error.message.includes('requires an index')) {
        console.log('Index missing, fetching without order');
        const fallbackQuery = query(
          collection(db, 'quizResults'),
          where('userId', '==', userId)
        );
        
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const fallbackResults = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: new Date()
        }));

        // Sort in memory
        fallbackResults.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return {
          quizResults: fallbackResults,
          totalQuizzes: fallbackResults.length,
          averageScore: fallbackResults.length > 0 
            ? fallbackResults.reduce((acc, curr) => 
                acc + (curr.correctAnswers / curr.totalQuestions), 0) / fallbackResults.length
            : 0,
          totalBookmarks: 0, // Will be updated in the next query
          recentTopics: fallbackResults.slice(0, 5).map(r => r.mainTopic)
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error getting user progress:', error);
    throw error;
  }
};

interface DiscussionEntry {
  type: 'question' | 'response' | 'acknowledgment';
  text: string;
  timestamp: Date;
}

interface DiscussionSummary {
  userId: string;
  timestamp: Date;
  topic: string;
  entries: DiscussionEntry[];
  totalExchanges: number;
}

export async function saveDiscussionHistory(discussion: DiscussionSummary) {
  try {
    const discussionsRef = collection(db, 'discussions');
    await addDoc(discussionsRef, {
      ...discussion,
      timestamp: discussion.timestamp.toISOString(),
      entries: discussion.entries.map(entry => ({
        ...entry,
        timestamp: entry.timestamp.toISOString()
      }))
    });
    console.log('Discussion history saved successfully');
  } catch (error) {
    console.error('Error saving discussion history:', error);
    throw error;
  }
}

// Function to get recent discussions for the progress dashboard
export async function getRecentDiscussions(userId: string, limit: number = 5) {
  try {
    const discussionsRef = collection(db, 'discussions');
    const q = query(
      discussionsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limit)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: new Date(doc.data().timestamp),
      entries: doc.data().entries.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }))
    }));
  } catch (error) {
    console.error('Error getting recent discussions:', error);
    throw error;
  }
}
