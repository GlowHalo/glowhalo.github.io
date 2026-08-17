'use strict';

// 임시 더미 파일 — Code Review Board GitHub Action e2e 검증용.
// 검증 끝나면 이 파일과 이 브랜치는 삭제됨(회장이 요청한 실제 배포 변경이 아님).

const express = require('express');
const app = express();

let cachedUsers = null;

// 의도적 이슈 1 (보안): 사용자 입력을 그대로 SQL 문자열에 이어붙임 — SQL 인젝션.
app.get('/users', (req, res) => {
  const name = req.query.name;
  const query = `SELECT * FROM users WHERE name = '${name}'`;
  db.query(query, (err, rows) => {
    res.json(rows);
  });
});

// 의도적 이슈 2 (신뢰성): await 없는 비동기 호출 + 에러 처리 없음, 재시도/타임아웃 없음.
app.post('/sync', (req, res) => {
  fetchUpstreamData().then((data) => {
    cachedUsers = data;
  });
  res.status(202).send('ok');
});

// 의도적 이슈 3 (유지보수성): 의미 없는 변수명 + 매직넘버 + 매우 깊은 중첩.
function proc(x) {
  let a = x;
  if (a) {
    if (a.length > 3) {
      if (a[0] === 1) {
        return a[1] * 42;
      }
    }
  }
  return 0;
}

module.exports = { app, proc };
