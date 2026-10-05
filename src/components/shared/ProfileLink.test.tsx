import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfileLink } from './ProfileLink';

function renderLink(username: string): void {
  render(
    <MemoryRouter>
      <ProfileLink userId="usr_1" user={{ username }} className="name">
        Author
      </ProfileLink>
    </MemoryRouter>,
  );
}

describe('ProfileLink (ACCOUNT-DELETE-01)', () => {
  it('links a live account to its profile', () => {
    renderLink('bob');
    expect(screen.getByRole('link', { name: 'Author' })).toHaveAttribute('href', '/profile/usr_1');
  });

  it('renders a deleted account as plain text, no link', () => {
    renderLink('deleted_usr_1');
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Author')).toHaveClass('name');
  });
});
