import type { Metadata } from "next";
import Link from "next/link";
import configPromise from "@payload-config";
import { getPayload } from "payload";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Locations — Hanoi International Fellowship",
  description:
    "Find HIF — three places to gather: Hanoi (Detech Building, Cầu Giấy Ward), Ecopark, and a Thai Nguyen outreach. Service times, maps, and directions.",
  openGraph: {
    title: "Locations — Hanoi International Fellowship",
    description: "Three places to gather — Hanoi, Ecopark, and Thai Nguyen. Find times, maps, and directions.",
    type: "website",
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type ServiceTime = {
  day?: string | null
  time?: string | null
  language?: string | null
  notes?: string | null
}

// ── Dot colours cycle ─────────────────────────────────────────────────────────
const DOT_COLOURS = ["dot-red", "dot-green", "dot-blue", "dot-purple"];

// ── Static fallback (used before any CMS locations are entered) ───────────────
function StaticLocations() {
  return (
    <>
      <section className="section" id="hanoi">
        <div className="container loc-detail" style={{ borderTop: 0, paddingTop: 0 }}>
          <div className="about-grid">
            <div className="about-copy reveal">
              <p className="eyebrow">Hanoi</p>
              <h2 className="section-title">HIF Hanoi</h2>
              <p className="loc-addr">Detech Building, 8 Tôn Thất Thuyết, Cầu Giấy Ward, Hà Nội 10000</p>
              <div className="time-card" style={{ margin: "18px 0" }}>
                <div className="time-loc"><span className="dot dot-red" />Sundays</div>
                <ul>
                  <li><strong>8:30 AM</strong> <span>Gathering</span></li>
                  <li><strong>10:00 AM</strong> <span>Gathering + KidzQuest</span></li>
                  <li><strong>11:30 AM</strong> <span>Vietnamese Fellowship</span></li>
                </ul>
              </div>
              <ul className="ticks">
                <li>Friendly hosts will welcome you from the lobby and help you find your way.</li>
                <li>Brilliant, safe care for kids at the 10:00 gathering (KidzQuest).</li>
                <li>Everything in English — a warm welcome for every nation.</li>
              </ul>
              <div className="visit-actions">
                <a className="btn btn-primary" href="https://maps.app.goo.gl/Lkq57WNkrt64A2aCA" target="_blank" rel="noopener noreferrer">Get directions</a>
                <Link className="btn btn-ghost" href="/plan-visit">Plan a visit</Link>
              </div>
            </div>
            <div className="about-media reveal">
              <div className="map-embed">
                <iframe title="Map to HIF Hanoi" src="https://maps.google.com/maps?q=Detech%20Building%208%20Ton%20That%20Thuyet%20Cau%20Giay%20Hanoi&z=15&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section about" id="ecopark">
        <div className="container loc-detail" style={{ borderTop: 0 }}>
          <div className="about-grid">
            <div className="about-media reveal">
              <div className="map-embed">
                <iframe title="Map to HIF Ecopark" src="https://maps.google.com/maps?q=146%20Thuy%20Nguyen%20Ecopark%20Hung%20Yen&z=15&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
              </div>
            </div>
            <div className="about-copy reveal">
              <p className="eyebrow">Ecopark</p>
              <h2 className="section-title">HIF Ecopark</h2>
              <p className="loc-addr">146 Đ. Thủy Nguyên, Khu đô thị Ecopark, Phụng Công, Hưng Yên 163963</p>
              <div className="time-card" style={{ margin: "18px 0" }}>
                <div className="time-loc"><span className="dot dot-green" />Sundays</div>
                <ul><li><strong>10:00 AM</strong> <span>Gathering on-site</span></li></ul>
              </div>
              <ul className="ticks">
                <li>A warm, growing congregation in the Ecopark township.</li>
                <li>Families and newcomers especially welcome.</li>
                <li>Everything in English.</li>
              </ul>
              <div className="visit-actions">
                <a className="btn btn-primary" href="https://maps.app.goo.gl/oHVQucWwUddMYU9E7" target="_blank" rel="noopener noreferrer">Get directions</a>
                <Link className="btn btn-ghost" href="/plan-visit">Plan a visit</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="thainguyen">
        <div className="container loc-detail" style={{ borderTop: 0 }}>
          <div className="about-grid">
            <div className="about-copy reveal">
              <p className="eyebrow">Thai Nguyen <span className="loc-badge">Outreach</span></p>
              <h2 className="section-title">HIF Thai Nguyen</h2>
              <p className="loc-addr">Meets at HTTL Thái Nguyên · ngõ 62 Hoàng Văn Thụ, Phan Đình Phùng, Thái Nguyên</p>
              <div className="time-card" style={{ margin: "18px 0" }}>
                <div className="time-loc"><span className="dot" style={{ background: "var(--blue)" }} />Gatherings</div>
                <ul><li><strong>Get in touch</strong> <span>for the next gathering</span></li></ul>
              </div>
              <ul className="ticks">
                <li>A growing outreach for international students and workers.</li>
                <li>Hosted with our friends at the local Evangelical church.</li>
                <li>New faces always welcome — reach out and we&apos;ll connect you.</li>
              </ul>
              <div className="visit-actions">
                <a className="btn btn-primary" href="https://maps.app.goo.gl/gjPaFqJjbDoRdgr39" target="_blank" rel="noopener noreferrer">Get directions</a>
                <a className="btn btn-ghost" href="mailto:admin@hif.vn?subject=Thai%20Nguyen%20gathering">Ask about Thai Nguyen</a>
              </div>
            </div>
            <div className="about-media reveal">
              <div className="map-embed">
                <iframe title="Map to HIF Thai Nguyen" src="https://maps.google.com/maps?q=Hoi%20Thanh%20Tin%20Lanh%20Thai%20Nguyen%20Hoang%20Van%20Thu&z=15&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ── Dynamic location block ────────────────────────────────────────────────────

type LocationDoc = {
  id: string | number
  name: string
  address?: string | null
  mapURL?: string | null
  serviceTimes?: ServiceTime[] | null
  isActive?: boolean | null
}

function LocationBlock({ loc, index }: { loc: LocationDoc; index: number }) {
  const mapFirst = index % 2 === 1; // alternate: odd-indexed get map on left
  const dotColor = DOT_COLOURS[index % DOT_COLOURS.length];
  const anchorId = (loc.name as string).toLowerCase().replace(/\s+/g, "-");

  // Group service times by day
  const times = (loc.serviceTimes ?? []) as ServiceTime[];

  const copyBlock = (
    <div className="about-copy reveal">
      <p className="eyebrow">{loc.name as string}</p>
      <h2 className="section-title">HIF {loc.name as string}</h2>
      {loc.address && <p className="loc-addr">{loc.address as string}</p>}
      {times.length > 0 && (
        <div className="time-card" style={{ margin: "18px 0" }}>
          <div className="time-loc">
            <span className={`dot ${dotColor}`} />
            {times[0]?.day ?? "Services"}
          </div>
          <ul>
            {times.map((t, i) => (
              <li key={i}>
                {t.time && <strong>{t.time}</strong>}
                {t.language && <span> {t.language}</span>}
                {t.notes && <span> — {t.notes}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="visit-actions">
        {loc.mapURL && (
          <a
            className="btn btn-primary"
            href={loc.mapURL as string}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions
          </a>
        )}
        <Link className="btn btn-ghost" href="/plan-visit">
          Plan a visit
        </Link>
      </div>
    </div>
  );

  const mapBlock = loc.mapURL ? (
    <div className="about-media reveal">
      <div className="map-embed">
        <iframe
          title={`Map to HIF ${loc.name}`}
          src={loc.mapURL as string}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  ) : null;

  return (
    <section
      className={`section${index % 2 === 1 ? " about" : ""}`}
      id={anchorId}
    >
      <div className="container loc-detail" style={{ borderTop: 0, paddingTop: index === 0 ? 0 : undefined }}>
        <div className="about-grid">
          {mapFirst ? (
            <>
              {mapBlock}
              {copyBlock}
            </>
          ) : (
            <>
              {copyBlock}
              {mapBlock}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LocationsPage() {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "locations",
    where: { isActive: { not_equals: false } },
    sort: "order",
    depth: 1,
    limit: 20,
    overrideAccess: false,
  });
  const locations = result.docs as LocationDoc[];

  // Derive anchor links for hero buttons
  const heroAnchors = locations.slice(0, 3).map((l) => ({
    id: (l.name as string).toLowerCase().replace(/\s+/g, "-"),
    name: l.name as string,
  }));

  return (
    <>
      {/* PAGE HERO */}
      <section className="page-hero">
        <div className="page-kaleido" aria-hidden="true" />
        <div className="container">
          <p className="breadcrumb">
            <Link href="/">Home</Link> · Locations
          </p>
          <p className="eyebrow eyebrow-light">Find us</p>
          <h1>
            Three places<br />to gather.
          </h1>
          <p className="page-lead">
            We gather across northern Vietnam — in Hanoi, in Ecopark, and through an outreach in
            Thai Nguyen. Here&apos;s where to find us, when we meet, and how to get there.
          </p>
          {(heroAnchors.length > 0 || locations.length === 0) && (
            <div className="final-actions" style={{ justifyContent: "flex-start", marginTop: "30px" }}>
              {locations.length === 0 ? (
                <>
                  <a className="btn btn-primary btn-lg" href="#hanoi">Hanoi</a>
                  <a className="btn btn-outline-light btn-lg" href="#ecopark">Ecopark</a>
                  <a className="btn btn-outline-light btn-lg" href="#thainguyen">Thai Nguyen</a>
                </>
              ) : (
                heroAnchors.map((a, i) => (
                  <a
                    key={a.id}
                    className={`btn btn-lg ${i === 0 ? "btn-primary" : "btn-outline-light"}`}
                    href={`#${a.id}`}
                  >
                    {a.name}
                  </a>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* LOCATIONS */}
      {locations.length > 0 ? (
        locations.map((loc, i) => (
          <LocationBlock key={String(loc.id)} loc={loc} index={i} />
        ))
      ) : (
        <StaticLocations />
      )}

      {/* CTA */}
      <section className="section final-cta">
        <div className="final-kaleido" aria-hidden="true" />
        <div className="container final-inner reveal">
          <h2>We&apos;ll be looking for you.</h2>
          <p>Tell us you&apos;re coming and we&apos;ll have a friendly face ready to welcome you.</p>
          <div className="final-actions">
            <Link className="btn btn-primary btn-lg" href="/plan-visit">Plan a visit</Link>
            <Link className="btn btn-outline-light btn-lg" href="/contact">Contact us</Link>
          </div>
        </div>
      </section>
    </>
  );
}
