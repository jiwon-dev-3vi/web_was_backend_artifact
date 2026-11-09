import './style.css';

const apiStatus = document.getElementById('api-status');
const fileStatus = document.getElementById('file-status');
const buildStatus = document.getElementById('build-status');
const message = document.getElementById('message');
const refresh = document.getElementById('refresh');
const products = document.getElementById('products');

document.querySelectorAll('nav a').forEach(link => {
  if (link.pathname === location.pathname) link.setAttribute('aria-current', 'page');
});

if (location.pathname === '/catalog') {
  document.querySelector('h1').textContent = 'API로 연결되는 상품 목록.';
}

async function requestJson(url) {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`${url}: JSON 응답을 받지 못했습니다. (${response.status})`);
  }
  return response.json();
}

async function refreshConnection() {
  refresh.disabled = true;
  products.replaceChildren();
  apiStatus.textContent = '확인 중';
  fileStatus.textContent = '확인 중';
  buildStatus.textContent = '확인 중';
  message.textContent = '연결 정보를 불러오고 있습니다.';

  try {
    const backend = await requestJson('/api/status');
    apiStatus.textContent = '연결됨';
    fileStatus.textContent = backend.frontend.ready ? '반영됨' : '파일 없음';
    const frontend = await requestJson('/build-info.json').catch(() => null);
    buildStatus.textContent = !frontend?.buildId || !backend.frontend.buildId
      ? '확인 불가'
      : frontend.buildId === backend.frontend.buildId ? '일치' : '불일치';
    message.textContent = backend.frontend.ready
      ? `화면 파일 ${backend.frontend.assetCount}개가 백엔드에 반영되어 있습니다.`
      : 'API는 연결되었지만 백엔드의 화면 산출물이 없습니다.';

    const result = await requestJson('/api/products');
    for (const product of result.products) {
      const card = document.createElement('article');
      card.className = 'product';
      const visual = document.createElement('div');
      visual.className = 'product-visual';
      visual.textContent = product.symbol;
      const category = document.createElement('p');
      category.className = 'product-category';
      category.textContent = product.category;
      const name = document.createElement('h3');
      name.textContent = product.name;
      const price = document.createElement('p');
      price.className = 'product-price';
      price.textContent = `${product.price.toLocaleString('ko-KR')}원`;
      card.append(visual, category, name, price);
      products.append(card);
    }
  } catch (error) {
    if (apiStatus.textContent === '확인 중') {
      apiStatus.textContent = '연결 실패';
      fileStatus.textContent = '확인 불가';
      buildStatus.textContent = '확인 불가';
    }
    message.textContent = error.message;
  } finally {
    refresh.disabled = false;
  }
}

refresh.addEventListener('click', refreshConnection);
refreshConnection();
