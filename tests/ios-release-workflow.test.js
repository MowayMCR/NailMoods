import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Apple upload gates allow the release trigger and exclude PRs, other branches and verification runs',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/ios-testflight.yml',import.meta.url),'utf8');
  const gates=[...workflow.matchAll(/^\s+if: (inputs\.mode.*)$/gm)].map(match=>match[1]);
  assert.equal(gates.length,5,'One unsigned archive gate and four signing/upload gates');
  for(const event of ['workflow_dispatch','push','pull_request','pull_request_target']){
    for(const ref of ['refs/heads/feat/ios-testflight-beta1','refs/heads/main','refs/heads/feature']){
      for(const mode of ['verify','testflight','']){
        const expected=mode==='testflight'&&(event==='workflow_dispatch'||(event==='push'&&ref==='refs/heads/feat/ios-testflight-beta1'));
        const values=gates.map(expression=>Function('inputs','github',`return (${expression})`)({mode},{event_name:event,ref}));
        assert.deepEqual(values,[!expected,expected,expected,expected,expected],`${event} ${ref} ${mode}`);
      }
    }
  }
  const release=readFileSync(new URL('../.github/workflows/ios-release-20261006.yml',import.meta.url),'utf8');
  assert.match(release,/branches: \[feat\/ios-testflight-beta1\]/);
  assert.match(release,/source_ref: \$\{\{ github.sha \}\}/,'Build the exact triggering commit');
});
