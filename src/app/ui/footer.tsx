import Link from "next/link";

import type { ProfileData } from "@/lib/types";

type Props = { profile: ProfileData };

export function Footer({ profile }: Props) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p className="footer-copy">
          © {year} {profile.name} · {profile.location}
        </p>
        <nav className="footer-links" aria-label="Footer links">
          {profile.githubUsername && (
            <Link
              className="footer-link"
              href={`https://github.com/${profile.githubUsername}`}
              target="_blank"
            >
              GitHub
            </Link>
          )}
          {profile.googleScholarUrl && (
            <Link className="footer-link" href={profile.googleScholarUrl} target="_blank">
              Scholar
            </Link>
          )}
          {profile.website && (
            <Link className="footer-link" href={profile.website} target="_blank">
              ETRI
            </Link>
          )}
          <Link className="footer-link" href="/contact">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
