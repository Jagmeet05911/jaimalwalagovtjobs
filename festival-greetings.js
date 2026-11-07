(function(){
  'use strict';
  var box=document.getElementById('festivalGreeting');
  if(!box)return;
  // Show for three calendar days: 7, 8 and 9 November 2026 (India time).
  var now=new Date();
  var start=new Date('2026-11-07T00:00:00+05:30');
  var end=new Date('2026-11-10T00:00:00+05:30');
  if(now>=start && now<end){box.hidden=false;}
})();