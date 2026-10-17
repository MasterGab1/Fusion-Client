const test=require('node:test'), assert=require('node:assert/strict');
const {gameOutput}=require('../electron/game-output.cjs');
test('fragmented XML, UTF-8, secrets and severity become readable entries',()=>{
  const lines=[],stream=gameOutput((message,level)=>lines.push({message,level}),'private-token');
  const input=Buffer.from('Starting…\n<log4j:Event logger="game" level="WARN">\n<log4j:Message><![CDATA[Hello café private-token\nsecond line]]></log4j:Message>\n</log4j:Event>\n[Client/ERROR] Failed\nlast');
  for(let i=0;i<input.length;i++)stream.write(input.subarray(i,i+1));stream.end();
  assert.deepEqual(lines,[{message:'Starting…',level:'game'},{message:'Hello café [redacted]\nsecond line',level:'warn'},{message:'[Client/ERROR] Failed',level:'error'},{message:'last',level:'game'}]);
});
test('malformed XML is bounded, entity text is decoded and stderr stays separate',()=>{
  const lines=[],stream=gameOutput((message,level)=>lines.push({message,level}));
  stream.write('<Event level="INFO"><Message>A &amp; B &lt; C</Message></Event>');
  stream.write('<log4j:Event>'+ 'x'.repeat(140000));stream.end();
  assert.equal(lines[0].message,'A & B < C');assert.equal(lines[1].level,'warn');assert.equal(lines.length,2);
});
test('XML exception details are preserved and redacted',()=>{
  const lines=[],stream=gameOutput((message,level)=>lines.push({message,level}),'private-token');
  stream.write('<log4j:Event level="ERROR"><log4j:Message><![CDATA[Game failure]]></log4j:Message><log4j:Throwable><![CDATA[java.lang.Exception: private-token\n at Game.start(Game.java:12)]]></log4j:Throwable></log4j:Event>');stream.end();
  assert.deepEqual(lines,[{level:'error',message:'Game failure\njava.lang.Exception: [redacted]\n at Game.start(Game.java:12)'}]);
});
