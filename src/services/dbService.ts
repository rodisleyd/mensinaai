import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Course, Module, Progress } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const saveCourse = async (courseData: any, userId: string) => {
  try {
    const courseRef = doc(collection(db, 'courses'));
    const course: Course = {
      id: courseRef.id,
      userId,
      titulo: courseData.titulo_curso,
      createdAt: Date.now(),
    };
    await setDoc(courseRef, course);

    for (const mod of courseData.modulos) {
      const moduleRef = doc(collection(db, `courses/${courseRef.id}/modules`));
      const module: Module = {
        id: moduleRef.id,
        courseId: courseRef.id,
        ordem: mod.ordem,
        titulo: mod.titulo_modulo,
        conteudo_aula: mod.conteudo_aula,
        exemplo_pratico: mod.exemplo_pratico,
        simulado: mod.simulado
      };
      await setDoc(moduleRef, module);
    }

    return courseRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'courses');
    return null;
  }
};

export const getCourse = async (courseId: string) => {
  try {
    const docRef = doc(db, 'courses', courseId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() } as Course;
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `courses/${courseId}`);
    return null;
  }
};

export const getModules = async (courseId: string) => {
  try {
    const q = query(collection(db, `courses/${courseId}/modules`), orderBy('ordem', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Module[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `courses/${courseId}/modules`);
    return [];
  }
};

export const getUserCourses = async (userId: string) => {
  try {
    const q = query(collection(db, 'courses'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'courses');
    return [];
  }
};

export const getProgress = async (userId: string, courseId: string) => {
  try {
    const q = query(collection(db, `users/${userId}/progress`), where('courseId', '==', courseId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Progress[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/progress`);
    return [];
  }
};

export const getAllUserProgress = async (userId: string) => {
  try {
    const q = query(collection(db, `users/${userId}/progress`));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Progress[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${userId}/progress`);
    return [];
  }
};

export const updateProgress = async (userId: string, courseId: string, moduleId: string, score: number, completed: boolean) => {
  try {
    const progressRef = doc(db, `users/${userId}/progress`, `${courseId}_${moduleId}`);
    await setDoc(progressRef, {
      userId,
      courseId,
      moduleId,
      score,
      completed,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/progress`);
  }
};

export const deleteCourse = async (courseId: string) => {
  try {
    const modules = await getModules(courseId);
    for (const mod of modules) {
      const modRef = doc(db, `courses/${courseId}/modules`, mod.id);
      await deleteDoc(modRef);
    }
    const docRef = doc(db, 'courses', courseId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `courses/${courseId}`);
    return false;
  }
};
