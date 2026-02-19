import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

/* --------------------------------------------------------------------------
   Navigation routes — Header와 동일한 경로 체계
   -------------------------------------------------------------------------- */
const quickLinks = [
  { labelKey: "about" as const, href: "/about" },
  { labelKey: "brand" as const, href: "/brand" },
  { labelKey: "products" as const, href: "/products" },
  { labelKey: "newsroom" as const, href: "/newsroom" },
] as const;

const legalLinks = [
  { labelKey: "privacy" as const, href: "/privacy" },
  { labelKey: "terms" as const, href: "/terms" },
] as const;

/* ==========================================================================
   Inline SVG Icons
   ========================================================================== */

/** 16x16 map pin icon */
function IconMapPin({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/** 16x16 phone icon */
function IconPhone({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

/** 16x16 mail icon */
function IconMail({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/** 24x24 Instagram icon */
function IconInstagram({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

/** 24x24 YouTube icon */
function IconYouTube({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

/* ==========================================================================
   Footer Component — Server Component
   ========================================================================== */

export function Footer() {
  const t = useTranslations();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white">
      <div className="container-site">
        {/* ----------------------------------------------------------------
            Upper Section — 4-column grid
            ---------------------------------------------------------------- */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Company Identity */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-2xl font-bold tracking-widest">CELLROMAX</p>
              <p className="text-xs tracking-[0.3em] text-secondary mt-1">
                SCIENCE
              </p>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t("about.mission.description")}
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">
              {t("nav.home") === t("nav.home") ? "\uBC14\uB85C\uAC00\uAE30" : "Quick Links"}
            </h3>
            <nav aria-label="Footer navigation">
              <ul className="flex flex-col gap-2.5">
                {quickLinks.map(({ labelKey, href }) => (
                  <li key={labelKey}>
                    <Link
                      href={href}
                      className="text-sm text-gray-400 hover:text-white transition-colors duration-150"
                    >
                      {t(`nav.${labelKey}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Column 3: Company Info */}
          <div>
            <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">
              {t("footer.company")}
            </h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-2 text-sm text-gray-400">
                <IconMapPin className="shrink-0 mt-0.5" />
                <span>
                  {t("footer.address")}:{" "}
                  {"\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uC131\uB3D9\uAD6C \uC544\uCC28\uC0B0\uB85C 126, 7\uCE35"}
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-400">
                <IconPhone className="shrink-0 mt-0.5" />
                <span>
                  {t("footer.phone")}: 02-000-0000
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-400">
                <IconMail className="shrink-0 mt-0.5" />
                <span>
                  {t("footer.email")}: info@cellromax.com
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: Social & CTA */}
          <div>
            <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">
              Follow Us
            </h3>
            <div className="flex items-center gap-4 mb-6">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-gray-400 hover:text-secondary transition-colors duration-150"
              >
                <IconInstagram />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="text-gray-400 hover:text-secondary transition-colors duration-150"
              >
                <IconYouTube />
              </a>
            </div>
            <Link
              href="/contact"
              className="text-sm text-secondary hover:text-accent transition-colors duration-150"
            >
              {t("nav.contact")} &rarr;
            </Link>
          </div>
        </div>

        {/* ----------------------------------------------------------------
            Divider
            ---------------------------------------------------------------- */}
        <div className="border-t border-white/10" />

        {/* ----------------------------------------------------------------
            Bottom Section — Copyright & Legal Links
            ---------------------------------------------------------------- */}
        <div className="py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            {t("footer.copyright", { year: currentYear })}
          </p>
          <div className="flex gap-6">
            {legalLinks.map(({ labelKey, href }) => (
              <Link
                key={labelKey}
                href={href}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-150"
              >
                {t(`footer.links.${labelKey}`)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
