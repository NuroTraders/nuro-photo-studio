const socialLinks = [
  { name: 'GitHub', handle: '@nasiropintu', href: 'https://github.com/nasiropintu' },
  { name: 'X (Twitter)', handle: '@nasiropintu', href: 'https://x.com/nasiropintu' },
  { name: 'Instagram', handle: '@the_np2', href: 'https://www.instagram.com/the_np2/' },
  { name: 'Facebook', handle: 'mohammadnasiruddin.pintu', href: 'https://www.facebook.com/mohammadnasiruddin.pintu/' },
];

const aiCredits = [
  { name: 'Gemini', provider: 'Google DeepMind', role: 'Architecture & agentic workflows' },
  { name: 'Manus', provider: 'Manus AI', role: 'Autonomous planning & synthesis' },
  { name: 'ChatGPT', provider: 'OpenAI', role: 'Logic optimization & reasoning' },
  { name: 'DeepSeek', provider: 'DeepSeek', role: 'Algorithmic engineering & core logic' },
  { name: 'Claude', provider: 'Anthropic', role: 'Systems architecture & clean design' },
  { name: 'Vibe by Mistral', provider: 'Mistral AI', role: 'Fast generation & execution' },
];

const openSourceCredits = [
  { name: 'Vite', author: 'Evan You', detail: 'Local web development and production build tool · MIT' },
  { name: 'Electron', author: 'Electron Community', detail: 'Cross-platform desktop runtime · MIT' },
  { name: 'Electron Builder', author: 'Vladimir Krivosheev', detail: 'Desktop packaging and installer tooling · MIT' },
  { name: 'Concurrently', author: 'Kimmo Brunfeldt', detail: 'Runs local development processes together · MIT' },
  { name: 'cross-env', author: 'Kent C. Dodds', detail: 'Cross-platform environment variables for scripts · MIT' },
  { name: 'wait-on', author: 'Jeff Barczewski', detail: 'Waits for local development services · MIT' },
];

export function createAboutCreditsContent(documentRef = document) {
  const content = documentRef.createElement('div');
  content.className = 'brand-about-content';

  const hero = documentRef.createElement('section');
  hero.className = 'brand-creator-hero';
  const avatar = documentRef.createElement('div');
  avatar.className = 'brand-avatar-wrap';
  const image = documentRef.createElement('img');
  image.className = 'brand-avatar-image';
  image.src = './nasirpintu.jpg';
  image.alt = 'Portrait of NasirPintu';
  const fallback = documentRef.createElement('span');
  fallback.className = 'brand-avatar-fallback';
  fallback.textContent = 'NP';
  fallback.hidden = true;
  image.addEventListener('error', () => {
    image.hidden = true;
    fallback.hidden = false;
  }, { once: true });
  const badge = documentRef.createElement('span');
  badge.className = 'brand-avatar-badge';
  badge.textContent = '✦';
  badge.title = 'Creator';
  badge.setAttribute('aria-hidden', 'true');
  avatar.append(image, fallback, badge);

  const identity = documentRef.createElement('div');
  identity.className = 'brand-creator-meta';
  const pill = documentRef.createElement('span');
  pill.className = 'brand-love-pill';
  pill.innerHTML = '<span aria-hidden="true">♥</span> Crafted with Love';
  const name = documentRef.createElement('h3');
  name.className = 'brand-creator-name';
  name.textContent = 'NasirPintu';
  const role = documentRef.createElement('p');
  role.className = 'brand-creator-role';
  role.textContent = 'Mohammad Nasiruddin Pintu · Creator, Product Architect & Open-Source Builder';
  const bio = documentRef.createElement('p');
  bio.className = 'brand-creator-bio';
  bio.textContent = 'Building free, private-by-design tools that empower people without paywalls, subscriptions, or data tracking.';
  identity.append(pill, name, role, bio);
  hero.append(avatar, identity);
  content.append(hero);

  const socialSection = createSection(documentRef, 'Connect with NasirPintu', 'brand-social-section');
  const socialGrid = documentRef.createElement('div');
  socialGrid.className = 'brand-social-grid';
  for (const social of socialLinks) {
    const link = documentRef.createElement('a');
    link.className = 'brand-social-card';
    link.href = social.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${social.name}, ${social.handle} (opens in a new tab)`);
    const linkName = documentRef.createElement('strong');
    linkName.textContent = social.name;
    const handle = documentRef.createElement('small');
    handle.textContent = social.handle;
    const arrow = documentRef.createElement('span');
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden', 'true');
    link.append(linkName, handle, arrow);
    socialGrid.append(link);
  }
  socialSection.append(socialGrid);
  content.append(socialSection);

  const aiSection = createSection(documentRef, 'AI agent collaboration credits', 'brand-ai-section');
  const aiHeadingRow = documentRef.createElement('div');
  aiHeadingRow.className = 'brand-section-heading-row';
  const sublabel = documentRef.createElement('span');
  sublabel.className = 'brand-section-sublabel';
  sublabel.textContent = 'Human-directed · Agent-assisted';
  aiHeadingRow.append(sublabel);
  const statement = documentRef.createElement('p');
  statement.className = 'brand-section-copy';
  statement.append('Conceived and architected by ');
  const creator = documentRef.createElement('strong');
  creator.textContent = 'NasirPintu';
  statement.append(creator, ' with contributions from the AI assistants listed here.');
  const aiGrid = documentRef.createElement('div');
  aiGrid.className = 'brand-credit-grid brand-ai-grid';
  for (const credit of aiCredits) {
    const card = documentRef.createElement('article');
    card.className = 'brand-credit-card brand-ai-card';
    const dot = documentRef.createElement('span');
    dot.className = 'brand-credit-dot';
    dot.setAttribute('aria-hidden', 'true');
    const copy = documentRef.createElement('div');
    const creditName = documentRef.createElement('strong');
    creditName.textContent = credit.name;
    const provider = documentRef.createElement('small');
    provider.textContent = credit.provider;
    const task = documentRef.createElement('span');
    task.textContent = credit.role;
    copy.append(creditName, provider, task);
    card.append(dot, copy);
    aiGrid.append(card);
  }
  aiSection.append(aiHeadingRow, statement, aiGrid);
  content.append(aiSection);

  const openSourceSection = createSection(documentRef, 'Open-source community credits', 'brand-oss-section');
  const intro = documentRef.createElement('p');
  intro.className = 'brand-section-copy';
  intro.textContent = 'Nuro Photo Studio is built with a small, open-source development and desktop toolchain. Image editing and export use browser Canvas and Blob APIs; no third-party image-processing library is included.';
  const ossGrid = documentRef.createElement('div');
  ossGrid.className = 'brand-credit-grid brand-oss-grid';
  for (const credit of openSourceCredits) {
    const card = documentRef.createElement('article');
    card.className = 'brand-oss-card';
    const head = documentRef.createElement('div');
    head.className = 'brand-oss-head';
    const packageName = documentRef.createElement('strong');
    packageName.textContent = credit.name;
    const author = documentRef.createElement('small');
    author.textContent = `by ${credit.author}`;
    const detail = documentRef.createElement('p');
    detail.textContent = credit.detail;
    head.append(packageName, author);
    card.append(head, detail);
    ossGrid.append(card);
  }
  openSourceSection.append(intro, ossGrid);
  content.append(openSourceSection);

  const privacy = documentRef.createElement('aside');
  privacy.className = 'brand-privacy-note';
  const shield = documentRef.createElement('span');
  shield.textContent = '◇';
  shield.setAttribute('aria-hidden', 'true');
  const assurance = documentRef.createElement('p');
  assurance.append(documentRef.createTextNode('Privacy promise: '));
  const emphasis = documentRef.createElement('strong');
  emphasis.textContent = 'Photos and exports stay on this device.';
  assurance.append(emphasis, ' No telemetry or server uploads.');
  privacy.append(shield, assurance);
  content.append(privacy);

  return content;
}

function createSection(documentRef, title, className) {
  const section = documentRef.createElement('section');
  section.className = `brand-about-section ${className}`;
  const heading = documentRef.createElement('h4');
  heading.className = 'brand-about-section-title';
  heading.textContent = title;
  section.append(heading);
  return section;
}
