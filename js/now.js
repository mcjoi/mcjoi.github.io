(function() {
  const API_ENDPOINT = 'https://pserver-w4e1.onrender.com/api/now';
  const DATA_URL = '/now/now.json';
  const PASSWORD = '9680';
  const DEFAULT_ITEMS = [
    {
      date: '2026-07-01',
      text: 'AI로 Chrome Extension을 만들어 봤다. https://mcjoi.github.io/post/01844'
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
      text: 'viltrox 28mm F4.5 렌즈를 샀다. https://mcjoi.github.io/post/05866'
    },
    {
      date: '2026-07-24',
      text: '살다보니 3D 프린팅이 필요한 날이 생겼다. 판교에 거의 무상으로 대행을 해주는 곳이 있어 다행이다.'
    }
  ];

  let nowItems = DEFAULT_ITEMS;
  let editingIndex = -1;

  const normalizeItem = (item) => ({
    date: String(item.date || '').slice(0, 10),
    text: String(item.text || '').trim()
  });

  const sortItems = (items) => {
    return items
      .map(normalizeItem)
      .filter((item) => item.date && item.text)
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const setItems = (items) => {
    nowItems = sortItems(items);
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
      const items = limit > 0 ? nowItems.slice(0, limit) : nowItems;
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

  const loadItems = async () => {
    try {
      const response = await fetch(`${DATA_URL}?v=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('now.json load failed');
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : data);
    } catch (error) {
      setItems(DEFAULT_ITEMS);
    }
    renderList();
  };

  const formatLocalDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const saveRemoteItems = async (password, items) => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password,
        items: sortItems(items)
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || '저장에 실패했습니다.');
    }

    return Array.isArray(payload.items) ? payload.items : items;
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

    const setStatus = (message) => {
      if (status) status.textContent = message;
    };

    const resetForm = () => {
      editingIndex = -1;
      if (save) save.textContent = '저장';
      if (date) date.value = formatLocalDate();
      if (text) text.value = '';
    };

    const renderStored = () => {
      if (!storedList) return;
      storedList.replaceChildren();

      if (!nowItems.length) {
        const empty = document.createElement('p');
        empty.className = 'now-editor-empty';
        empty.textContent = '관리할 항목이 없습니다.';
        storedList.appendChild(empty);
        return;
      }

      nowItems.forEach((item, index) => {
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
          editingIndex = index;
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
        remove.addEventListener('click', async () => {
          if (!password || password.value !== PASSWORD) {
            setStatus('비밀번호가 맞지 않습니다.');
            return;
          }

          const next = nowItems.filter((_, itemIndex) => itemIndex !== index);
          setStatus('삭제 저장 중...');
          try {
            const saved = await saveRemoteItems(password.value, next);
            setItems(saved);
            resetForm();
            renderList();
            renderStored();
            setStatus('삭제했습니다.');
          } catch (error) {
            setStatus(error.message === 'Failed to fetch' ? 'API 서버에 연결할 수 없습니다.' : error.message);
          }
        });

        actions.appendChild(edit);
        actions.appendChild(remove);
        row.appendChild(body);
        row.appendChild(actions);
        storedList.appendChild(row);
      });
    };

    resetForm();

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

    if (save) save.addEventListener('click', async () => {
      if (!password || password.value !== PASSWORD) {
        setStatus('비밀번호가 맞지 않습니다.');
        return;
      }

      const item = normalizeItem({
        date: date ? date.value : '',
        text: text ? text.value : ''
      });

      if (!item.date || !item.text) {
        setStatus('날짜와 내용을 입력해 주세요.');
        return;
      }

      const next = nowItems.slice();
      if (editingIndex >= 0) {
        next[editingIndex] = item;
      } else {
        next.unshift(item);
      }

      setStatus('저장 중...');
      try {
        const saved = await saveRemoteItems(password.value, next);
        setItems(saved);
        resetForm();
        renderList();
        renderStored();
        setStatus('저장했습니다.');
      } catch (error) {
        setStatus(error.message === 'Failed to fetch' ? 'API 서버에 연결할 수 없습니다.' : error.message);
      }
    });
  };

  loadItems().then(setupEditor);
})();
