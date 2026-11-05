import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  SupportTicket,
  SupportTicketReply,
  SupportTicketStatus,
  SupportTicketType,
} from '../types/domain';

export interface CreateSupportTicketInput {
  userId: string;
  userDisplayName: string;
  userEmail: string;
  userPhone?: string;
  type: SupportTicketType;
  subject: string;
  details: string;
  attachmentUrl?: string;
}

/**
 * Creates a new support ticket and stores it in Firestore (/support_tickets/{ticketId}).
 */
export async function createSupportTicket(
  input: CreateSupportTicketInput
): Promise<string> {
  const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const ticketRef = doc(db, 'support_tickets', ticketId);

  const payload = {
    ticketId,
    userId: input.userId.trim() || 'guest',
    userDisplayName: input.userDisplayName.trim() || 'زائر',
    userEmail: input.userEmail.trim(),
    userPhone: input.userPhone?.trim() || '',
    type: input.type,
    subject: input.subject.trim(),
    details: input.details.trim(),
    attachmentUrl: input.attachmentUrl?.trim() || '',
    status: 'new' as SupportTicketStatus,
    adminNote: '',
    replies: [] as SupportTicketReply[],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ticketRef, payload);
    return ticketId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `support_tickets/${ticketId}`);
  }
}

/**
 * Subscribes to support tickets submitted by a specific user.
 */
export function subscribeToUserSupportTickets(
  userId: string,
  callback: (tickets: SupportTicket[]) => void
): Unsubscribe {
  if (!userId || userId === 'guest') {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'support_tickets'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const tickets: SupportTicket[] = [];
      snapshot.forEach((d) => {
        tickets.push(d.data() as SupportTicket);
      });
      callback(tickets);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_tickets');
    }
  );
}

/**
 * Subscribes to all support tickets for staff/moderators/admins.
 */
export function subscribeToAllSupportTicketsForStaff(
  callback: (tickets: SupportTicket[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'support_tickets'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const tickets: SupportTicket[] = [];
      snapshot.forEach((d) => {
        tickets.push(d.data() as SupportTicket);
      });
      callback(tickets);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'support_tickets');
    }
  );
}

/**
 * Fetches all tickets once for admin/staff.
 */
export async function listAllSupportTicketsForStaff(): Promise<SupportTicket[]> {
  try {
    const q = query(
      collection(db, 'support_tickets'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    const results: SupportTicket[] = [];
    snap.forEach((d) => {
      results.push(d.data() as SupportTicket);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'support_tickets');
  }
}

/**
 * Updates a support ticket's status and optionally appends an administrative internal note.
 */
export async function updateSupportTicketStatus(
  ticketId: string,
  newStatus: SupportTicketStatus,
  adminNote?: string
): Promise<void> {
  const ticketRef = doc(db, 'support_tickets', ticketId);

  const updates: Record<string, unknown> = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  if (typeof adminNote === 'string') {
    updates.adminNote = adminNote.trim();
  }

  if (newStatus === 'closed') {
    updates.closedAt = serverTimestamp();
  }

  try {
    await updateDoc(ticketRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `support_tickets/${ticketId}`);
  }
}

/**
 * Appends a reply to a support ticket.
 * If written by staff, updates ticket status from 'new' to 'in_progress' automatically.
 */
export async function addReplyToSupportTicket(
  ticketId: string,
  currentTicket: SupportTicket,
  reply: {
    senderUid: string;
    senderName: string;
    senderRole: 'user' | 'moderator' | 'super_admin';
    message: string;
  }
): Promise<void> {
  const ticketRef = doc(db, 'support_tickets', ticketId);

  const newReply: SupportTicketReply = {
    replyId: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    senderUid: reply.senderUid,
    senderName: reply.senderName,
    senderRole: reply.senderRole,
    message: reply.message.trim(),
    createdAt: new Date(),
  };

  const updatedReplies = [...(currentTicket.replies || []), newReply];

  const updates: Record<string, unknown> = {
    replies: updatedReplies,
    updatedAt: serverTimestamp(),
  };

  // If staff replied and status is still new, advance to in_progress
  if (
    (reply.senderRole === 'moderator' || reply.senderRole === 'super_admin') &&
    currentTicket.status === 'new'
  ) {
    updates.status = 'in_progress';
  }

  try {
    await updateDoc(ticketRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `support_tickets/${ticketId}`);
  }
}
