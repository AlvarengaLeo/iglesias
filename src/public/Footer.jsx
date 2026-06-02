import { Icon } from './Icon.jsx';
import { href } from './router.js';
import { DAYS, formatClock, socialUrl } from './helpers.js';

// Richer footer: brand + mission, condensed service times, quick links, social.
export function Footer({ publicName, mission, serviceTimes, contact, social, links }) {
  const year = new Date().getFullYear();
  const hasSocial = social.facebook || social.instagram || social.youtube || social.whatsapp;

  return (
    <footer className="pp-footer-rich">
      <div className="pp-container pp-footer-cols">
        <div className="pp-footer-col">
          <div className="pp-footer-brand">{publicName}</div>
          {mission && <p className="pp-footer-mission">{mission}</p>}
          {hasSocial && (
            <div className="pp-social">
              {social.facebook && <a href={socialUrl('facebook', social.facebook)} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Icon name="facebook" /></a>}
              {social.instagram && <a href={socialUrl('instagram', social.instagram)} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icon name="instagram" /></a>}
              {social.youtube && <a href={socialUrl('youtube', social.youtube)} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Icon name="youtube" /></a>}
              {social.whatsapp && <a href={`https://wa.me/${social.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><Icon name="whatsapp" /></a>}
            </div>
          )}
        </div>

        {serviceTimes.length > 0 && (
          <div className="pp-footer-col">
            <h4 className="pp-footer-heading">Service Times</h4>
            <ul className="pp-footer-list">
              {serviceTimes.slice(0, 4).map((s) => (
                <li key={s.id}>{DAYS[s.day_of_week]} · {formatClock(s.start_time?.slice(0, 5))}</li>
              ))}
            </ul>
          </div>
        )}

        {links.length > 0 && (
          <div className="pp-footer-col">
            <h4 className="pp-footer-heading">Explore</h4>
            <ul className="pp-footer-list">
              {links.map((l) => <li key={l.path}><a href={href(l.path)}>{l.label}</a></li>)}
            </ul>
          </div>
        )}

        {(contact.address || contact.phone || contact.email) && (
          <div className="pp-footer-col">
            <h4 className="pp-footer-heading">Visit Us</h4>
            <ul className="pp-footer-list">
              {contact.address && <li>{contact.address}</li>}
              {contact.phone && <li><a href={`tel:${contact.phone}`}>{contact.phone}</a></li>}
              {contact.email && <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li>}
            </ul>
          </div>
        )}
      </div>

      <div className="pp-container pp-footer-bottom">
        <span>© {year} {publicName}. All rights reserved.</span>
        <span className="pp-powered">Powered by Sistema de Iglesia</span>
      </div>
    </footer>
  );
}
