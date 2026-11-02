const test = require('node:test');
const assert = require('node:assert/strict');
const { renderTemplate, renderSubject, normalizeTemplateParams } = require('../dist/templateEngine.js');

test('renders placeholders with and without surrounding whitespace', () => {
  assert.equal(
    renderTemplate('<p>Hello {{ member_name }} — {{birthday_person}}</p>', {
      member_name: 'Gülben',
      birthday_person: 'Deniz'
    }),
    '<p>Hello Gülben — Deniz</p>'
  );
});

test('normalizes null values to empty strings and non-string values to strings', () => {
  assert.deepEqual(normalizeTemplateParams({
    member_name: 'Gülben',
    optional: null,
    count: 3
  }), {
    member_name: 'Gülben',
    optional: '',
    count: '3'
  });
});

test('renders unknown placeholders as empty instead of leaking raw tokens', () => {
  assert.equal(renderSubject('Hello {{member_name}} {{missing_value}}', { member_name: 'Ada' }), 'Hello Ada ');
});

test('escapes untrusted text without changing template markup or plain-text subjects', () => {
  const params = { name: `<img src=x onerror="alert('x')"> & Ada` };
  assert.equal(renderTemplate('<p>Hello <strong>{{name}}</strong></p>', params),
    '<p>Hello <strong>&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; Ada</strong></p>');
  assert.equal(renderSubject('Hello {{name}}', params), `Hello <img src=x onerror="alert('x')"> & Ada`);
});

test('rejects placeholders in attributes, URL, comments and executable contexts', () => {
  const templates = [
    '<a href="{{link}}">open</a>', '<a href={{link}}>open</a>',
    '<img src="{{link}}">', '<div style="{{link}}">x</div>',
    '<!-- {{link}} --><p>x</p>', '<script>{{link}}</script>',
    '<style>{{link}}</style>', '<svg><text>{{link}}</text></svg>',
    '<template><p>{{link}}</p></template>'
  ];
  for (const template of templates) {
    assert.throws(() => renderTemplate(template, { link: 'javascript:alert(1)' }), /only supported in HTML text/, template);
  }
});

test('preserves multiple occurrences and treats replacements as literal text', () => {
  assert.equal(renderTemplate('<p>{{name}} / {{name}}</p>', { name: '$& <b> &amp;' }),
    '<p>$&amp; &lt;b&gt; &amp;amp; / $&amp; &lt;b&gt; &amp;amp;</p>');
});
