class RawString {
  constructor(value) {
    this.value = String(value);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return char;
    }
  }).replace(/'/g, '&#39;');
}

function normalizeValue(value) {
  if (value === false || value === null || value === undefined) {
    return '';
  }

  if (value instanceof RawString) {
    return value.value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item)).join('');
  }

  return escapeHtml(value);
}

export function raw(value) {
  return new RawString(value);
}

export function html(strings, ...values) {
  let result = '';
  for (let i = 0; i < strings.length; i += 1) {
    result += strings[i];
    if (i < values.length) {
      result += normalizeValue(values[i]);
    }
  }
  return result;
}

function highlightMarkup(text, query) {
  const source = typeof text === 'string' ? text : '';
  if (!query) {
    return escapeHtml(source);
  }

  const lower = source.toLowerCase();
  const term = query.toLowerCase();
  const length = term.length;
  if (!length || !lower.includes(term)) {
    return escapeHtml(source);
  }

  let cursor = 0;
  let output = '';
  while (cursor < source.length) {
    const index = lower.indexOf(term, cursor);
    if (index === -1) {
      output += escapeHtml(source.slice(cursor));
      break;
    }

    output += escapeHtml(source.slice(cursor, index));
    output += `<mark>${escapeHtml(source.slice(index, index + length))}</mark>`;
    cursor = index + length;
  }

  return output;
}

export function cardView(card, { query } = {}) {
  const titleMarkup = highlightMarkup(card.title ?? '', query);
  const descriptionMarkup = card.description ? highlightMarkup(card.description, query) : '';

  return html`
    <article class="card" data-card-id="${card.id}" draggable="true">
      <h3 class="card-title">${raw(titleMarkup)}</h3>
      ${descriptionMarkup ? html`<p class="card-body">${raw(descriptionMarkup)}</p>` : ''}
    </article>
  `;
}

export function columnView(column, { cardsMarkup, visibleCount, totalCount, queryActive }) {
  const countLabel = queryActive && typeof totalCount === 'number'
    ? `${visibleCount}/${totalCount}`
    : `${visibleCount}`;

  return html`
    <section class="column" data-column-id="${column.id}">
      <header class="column-header">
        <h2 class="column-title">${column.name}</h2>
        <span class="column-meta" aria-label="${queryActive ? 'Visible cards out of total' : 'Card count'}">${countLabel}</span>
      </header>
      <div class="card-list" data-col-id="${column.id}">
        ${cardsMarkup}
      </div>
      <button class="add-card" data-col-id="${column.id}" type="button">+ Add card</button>
    </section>
  `;
}
