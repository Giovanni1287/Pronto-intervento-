import { page } from '../components/layout.js';
import {
  hero, facts, serviceCards, catalog, leakSection, process, prontoPlus, about, contactSection, ctaBand
} from '../components/sections.js';
import { businessSchema, websiteSchema } from '../seo/schema.js';
import { images } from '../config/site.config.js';
import { imageUrl } from '../components/utils.js';

export default function home() {
  return {
    path: '/',
    html: page({
      title: '',
      path: '/',
      jsonLd: [websiteSchema(), businessSchema()],
      bodyClass: 'page-home',
      preload: imageUrl(images.hero, 'hero', { key: 'home/hero' }),
      body: [
        hero(),
        facts(),
        serviceCards(),
        catalog(),
        leakSection(),
        process(),
        prontoPlus(),
        about(),
        ctaBand(),
        contactSection()
      ].join('\n')
    })
  };
}
