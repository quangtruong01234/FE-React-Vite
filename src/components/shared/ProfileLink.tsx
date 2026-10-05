import type { MouseEventHandler, ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { isDeletedUser } from '@/lib/format/user';

interface ProfileLinkProps {
  userId: string;
  /** The author embed — a deleted account (ACCOUNT-DELETE-01) gets no link. */
  user: { username?: string | null } | null | undefined;
  className?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  children: ReactNode;
}

/**
 * Link to a person's profile, or plain text when their account was deleted:
 * the anonymised profile has nothing to show, so the author renders as
 * "Deleted user" without a destination.
 */
export function ProfileLink({ userId, user, className, onClick, children }: ProfileLinkProps): ReactElement {
  if (isDeletedUser(user)) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link to={`/profile/${userId}`} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
