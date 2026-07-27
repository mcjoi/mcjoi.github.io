(function() {
  const STORAGE_KEY = 'sunnybong.now.items';
  const EDITS_KEY = 'sunnybong.now.edits';
  const DELETED_KEY = 'sunnybong.now.deleted';
  const PASSWORD = '9680';
  const DEFAULT_ITEMS = [
    {
      date: '2026-07-01',
      text: 'AI로 Chrome Extension을 만들어 봤다. https://sunnybong.xyz/post/01844'
    },
    {
      date: '2026-07-14',
      text: '삼성에서 진짜 20% 온누리 상품권을 지급했다.'
    },
    {
      date: '2026-07-15',
      text: 'viltrox 26mm F2.8 렌즈가 공개되는 날이다. 성능은 준수하다는 평이지만, $299달러이므로 패스하기로 한다.'
    },
    {
      date: '2026-07-22',
      text: 'viltrox 28mm F4.5 렌즈를 샀다. https://sunnybong.xyz/post/05866'
    },
    {
      date: '2026-07-24',
      text: '살다보니 3D 프린팅이 필요한 날이 생겼다. 판교에 거의 무상으로 대행을 해주는 곳이 있어 다행이다.'
    }
  ];

  const readFallbackItems = () => {
    const data = document.getElementById('now-data');
    if (!data) return DEFAULT_ITEMS;
    try {
      let parsed = JSON.parse(data.textContent || '[]');
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed || '[]');
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return DEFAULT_ITEMS;
    }
  };

  const readStoredItems = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const writeStoredItems = (items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const readEdits = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(EDITS_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  };

  const writeEdits = (edits) => {
    localStorage.setItem(EDITS_KEY, JSON.stringify(edits));
  };

  const readDeletedKeys = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const writeDeletedKeys = (keys) => {
    localStorage.setItem(DELETED_KEY, JSON.stringify(keys));
  };

  const normalizeItem = (item) => ({
    date: String(item.date || '').slice(0, 10),
    text: String(item.text || '').trim()
  });

  const getItemKey = (item) => {
    const normalized = normalizeItem(item);
    return `${normalized.date}\n${normalized.text}`;
  };

  const sortItems = (items) => {
    return items
      .map(normalizeItem)
      .filter((item) => item.date && item.text)
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const sortManagedItems = (items) => {
    return items
      .map((item) => ({
        ...item,
        ...normalizeItem(item)
      }))
      .filter((item) => item.date && item.text)
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const getManagedItems = () => {
    const edits = readEdits();
    const deleted = new Set(readDeletedKeys());
    const stored = sortItems(readStoredItems()).map((item) => ({
      date: item.date,
      text: item.text,
      key: getItemKey(item),
      source: 'stored'
    }));
    const fallback = sortItems(readFallbackItems())
      .map((item) => {
        const key = getItemKey(item);
        const edited = edits[key] ? normalizeItem(edits[key]) : item;
        return {
          date: edited.date,
          text: edited.text,
          key,
          source: 'default'
        };
      })
      .filter((item) => !deleted.has(item.key));

    return sortManagedItems([...stored, ...fallback]);
  };

  const getItems = () => {
    const seen = new Set();
    return getManagedItems().filter((item) => {
      const key = getItemKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const appendLinkedText = (target, text) => {
    const urlPattern = /(https?:\/\/[^\s<]+)/g;
    let cursor = 0;
    let match;

    while ((match = urlPattern.exec(text)) !== null) {
      if (match.index > cursor) {
        target.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      }

      const anchor = document.createElement('a');
      anchor.href = match[0];
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = match[0];
      target.appendChild(anchor);
      cursor = match.index + match[0].length;
    }

    if (cursor < text.length) {
      target.appendChild(document.createTextNode(text.slice(cursor)));
    }
  };

  const renderList = () => {
    document.querySelectorAll('[data-now-list]').forEach((list) => {
      const limit = Number(list.dataset.nowLimit || 0);
      const items = limit > 0 ? getItems().slice(0, limit) : getItems();
      list.replaceChildren();

      if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'now-empty';
        empty.textContent = '등록된 단문이 없습니다.';
        list.appendChild(empty);
        return;
      }

      items.forEach((item) => {
        const article = document.createElement('article');
        article.className = 'now-item';

        const time = document.createElement('time');
        time.dateTime = item.date;
        time.textContent = item.date;

        const text = document.createElement('div');
        text.className = 'now-text';
        appendLinkedText(text, item.text);

        article.appendChild(time);
        article.appendChild(text);
        list.appendChild(article);
      });
    });
  };

  const formatLocalDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const setupEditor = () => {
    const editor = document.querySelector('[data-now-editor]');
    if (!editor) return;

    const gate = editor.querySelector('[data-now-gate]');
    const panel = editor.querySelector('[data-now-panel]');
    const password = editor.querySelector('[data-now-password]');
    const unlock = editor.querySelector('[data-now-unlock]');
    const date = editor.querySelector('[data-now-date]');
    const text = editor.querySelector('[data-now-text]');
    const save = editor.querySelector('[data-now-save]');
    const status = editor.querySelector('[data-now-status]');
    const storedList = editor.querySelector('[data-now-stored]');
    let editingItem = null;

    const setStatus = (message) => {
      if (status) status.textContent = message;
    };

    const renderStored = () => {
      if (!storedList) return;
      const items = getManagedItems();
      storedList.replaceChildren();

      if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'now-editor-empty';
        empty.textContent = '관리할 항목이 없습니다.';
        storedList.appendChild(empty);
        return;
      }

      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'now-editor-item';

        const body = document.createElement('div');
        const itemDate = document.createElement('time');
        itemDate.dateTime = item.date;
        itemDate.textContent = item.date;
        const itemText = document.createElement('p');
        itemText.textContent = item.text;
        body.appendChild(itemDate);
        body.appendChild(itemText);

        const actions = document.createElement('div');
        actions.className = 'now-editor-item-actions';

        const edit = document.createElement('button');
        edit.type = 'button';
        edit.textContent = '수정';
        edit.addEventListener('click', () => {
          editingItem = item;
          if (date) date.value = item.date;
          if (text) {
            text.value = item.text;
            text.focus();
          }
          if (save) save.textContent = '수정 저장';
          setStatus('수정할 내용을 입력해 주세요.');
        });

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '삭제';
        remove.addEventListener('click', () => {
          if (item.source === 'stored') {
            writeStoredItems(readStoredItems().filter((storedItem) => getItemKey(storedItem) !== item.key));
          } else {
            const deleted = new Set(readDeletedKeys());
            const edits = readEdits();
            deleted.add(item.key);
            delete edits[item.key];
            writeDeletedKeys(Array.from(deleted));
            writeEdits(edits);
          }
          editingItem = null;
          if (save) save.textContent = '저장';
          if (date) date.value = formatLocalDate();
          if (text) text.value = '';
          renderStored();
          renderList();
          setStatus('삭제했습니다.');
        });

        actions.appendChild(edit);
        actions.appendChild(remove);
        row.appendChild(body);
        row.appendChild(actions);
        storedList.appendChild(row);
      });
    };

    if (date) date.value = formatLocalDate();

    if (unlock) unlock.addEventListener('click', () => {
      if (!password || password.value !== PASSWORD) {
        setStatus('비밀번호가 맞지 않습니다.');
        return;
      }

      gate.hidden = true;
      panel.hidden = false;
      setStatus('작성 모드가 열렸습니다.');
      renderStored();
      if (text) text.focus();
    });

    if (password) password.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && unlock) unlock.click();
    });

    if (save) save.addEventListener('click', () => {
      const item = normalizeItem({
        date: date ? date.value : '',
        text: text ? text.value : ''
      });

      if (!item.date || !item.text) {
        setStatus('날짜와 내용을 입력해 주세요.');
        return;
      }

      if (editingItem && editingItem.source === 'default') {
        const edits = readEdits();
        edits[editingItem.key] = item;
        writeEdits(edits);
      } else if (editingItem && editingItem.source === 'stored') {
        const next = readStoredItems().map((storedItem) => (
          getItemKey(storedItem) === editingItem.key ? item : storedItem
        ));
        writeStoredItems(sortItems(next));
      } else {
        const deleted = new Set(readDeletedKeys());
        deleted.delete(getItemKey(item));
        writeDeletedKeys(Array.from(deleted));
        writeStoredItems(sortItems([item, ...readStoredItems()]));
      }

      editingItem = null;
      if (save) save.textContent = '저장';
      if (date) date.value = formatLocalDate();
      if (text) text.value = '';
      renderStored();
      renderList();
      setStatus('저장했습니다.');
    });
  };

  renderList();
  setupEditor();
})();
