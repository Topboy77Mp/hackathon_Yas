import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,v), removeItem: k => memory.delete(k) };
globalThis.window = {localStorage};
const {demoLogin,demoSnapshot,demoSave,demoTiers} = await import('../src/lib/demo.ts');
const {openSession,closeSession} = await import('../src/lib/session.ts');
const {validateTiers,paliersuivant,toApiTiers} = await import('../src/lib/tiers.ts');
beforeEach(() => {memory.clear();closeSession();openSession(demoLogin('admin','demo'));});
test('Les commandes individuelles reproduisent 38 participants, 146 sacs et les agrégats',()=>{
  const s=demoSnapshot();assert.equal(s.groups[0].participants_count,38);assert.equal(s.orders.length,38);
  assert.equal(s.orders.reduce((n,o)=>n+o.quantity,0),146);assert.equal(s.impact.total_order_value,2774000);
  assert.equal(s.impact.community_savings,438000);assert.equal(s.groups[0].quantity_to_next_tier,54);
  assert.ok(s.orders.every(o=>o.unit_price===19000 && o.total_amount===o.quantity*o.unit_price));
});
test('Une session réelle ou falsifiée ne peut pas utiliser les mutations locales',()=>{
  openSession({...demoLogin('commercant','demo'),user:{...demoLogin('admin','demo').user}});
  assert.throws(()=>demoSnapshot(),/invalide/);
  openSession({...demoLogin('admin','demo'),token:'real-jwt'});assert.throws(()=>demoSave('users',1,{status:'INACTIVE'}),/invalide/);
});
test('Le commerçant ne voit pas les autres boutiques et ne peut pas modérer',()=>{
  openSession(demoLogin('commercant','demo'));assert.deepEqual(demoSnapshot().shops.map(s=>s.id),[1]);
  assert.throws(()=>demoSave('shops',2,{name:'Interdit'}),/introuvable/);
  assert.throws(()=>demoSave('users',1,{status:'INACTIVE'}),/non autorisée/);
  assert.throws(()=>demoSave('shops',1,{status:'APPROVED'}),/administration/);
});
test('Les changements de prix et suppressions ne cassent pas les commandes existantes',()=>{
  assert.throws(()=>demoSave('products',1,{},true),/commandes actives/);
  assert.throws(()=>demoSave('products',1,{individual_price:1000}),/commandes actives/);
  demoSave('products',1,{name:'Engrais renommé'});assert.equal(demoSnapshot().groups[0].product.name,'Engrais renommé');
});
test('La création, modification et suppression d’un brouillon persistent',()=>{
  openSession(demoLogin('commercant','demo'));
  const source=demoSnapshot().products[1];const id=demoSave('products',null,{...source,name:'Kit scolaire',category:'Éducation'});
  demoSave('products',id,{name:'Kit scolaire complet'});assert.equal(demoSnapshot().products.find(p=>p.id===id).name,'Kit scolaire complet');
  demoSave('products',id,{},true);assert.ok(!demoSnapshot().products.some(p=>p.id===id));
});
test('Un brouillon sans paliers ne peut pas être activé ; une grille valide le publie',()=>{
  assert.throws(()=>demoSave('products',2,{status:'ACTIVE'}),/au moins un palier/);
  demoTiers(2,[{min_quantity:1,max_quantity:19,unit_price:5000},{min_quantity:20,max_quantity:null,unit_price:4500}]);
  assert.equal(demoSnapshot().products[1].status,'ACTIVE');assert.equal(demoSnapshot().products[1].best_price,4500);
});
test('La progression logistique est séquentielle et ne modifie jamais le paiement',()=>{
  openSession(demoLogin('commercant','demo'));
  assert.throws(()=>demoSave('orders',1001,{delivery_status:'DELIVERED'}),/non autorisée/);
  for(const status of ['CONFIRMED','PREPARED','SHIPPED','DELIVERED'])demoSave('orders',1001,{delivery_status:status,order_status:'CONFIRMED'});
  assert.equal(demoSnapshot().orders[0].delivery_status,'DELIVERED');assert.equal(demoSnapshot().orders[0].payment_status,'PENDING');
});
test('L’annulation neutralise volumes et économies et rembourse les paiements réussis',()=>{
  const s=JSON.parse(memory.get('kashflow.management.demo.v1') ?? JSON.stringify(demoSnapshot()));s.orders[0].payment_status='SUCCESS';localStorage.setItem('kashflow.management.demo.v1',JSON.stringify(s));
  demoSave('groups',1,{status:'CANCELLED'});const result=demoSnapshot();assert.equal(result.impact.orders,0);assert.equal(result.impact.community_savings,0);assert.equal(result.groups[0].current_quantity,0);assert.equal(result.products[0].reserved_units,0);assert.equal(result.orders[0].payment_status,'REFUNDED');
  assert.throws(()=>demoSave('groups',1,{status:'CANCELLED'}),/Seul un groupe ouvert/);
});
test('Les paliers commencent à 1, ont des bornes contiguës et des prix entiers décroissants',()=>{
  const first=paliersuivant([],100,5000);assert.equal(first.minQuantity,1);
  const rows=[first,{id:'two',minQuantity:20,unitPrice:4500}];assert.deepEqual(validateTiers(rows,100),[]);assert.equal(toApiTiers(rows)[0].max_quantity,19);
  assert.ok(validateTiers([{...first,minQuantity:1.5}],100).length);
  assert.ok(validateTiers([first,{id:'bad',minQuantity:101,unitPrice:6000}],100).length);
});
test('Une session de démonstration ne peut jamais appeler le backend réel',async()=>{
  const {api}=await import('../src/lib/api/client.ts');let called=false;globalThis.fetch=async()=>{called=true;throw new Error('Unexpected network');};
  await assert.rejects(()=>api('/merchant/products'),/démonstration locale/);assert.equal(called,false);
});
test('L’adaptateur API commerçant charge uniquement la liste privée et ses groupes',async()=>{
  const {loadManagement}=await import('../src/lib/management.ts');const demo=demoSnapshot();
  openSession({...demoLogin('commercant','demo'),token:'test-jwt'});const paths=[];
  globalThis.fetch=async(url,options)=>{const path=new URL(url).pathname;paths.push(path);assert.equal(options.headers.get('Authorization'),'Bearer test-jwt');const payload=path==='/merchant/dashboard'?{...demo.merchant,rows:[{group_id:1,total_amount:2774000}]}:path==='/merchant/products'?{products:demo.products}:path==='/groups/1'?demo.groups[0]:null;assert.notEqual(payload,null,`Unexpected API ${path}`);return new Response(JSON.stringify(payload),{status:200});};
  const data=await loadManagement();assert.equal(data.groups[0].total_amount,2774000);assert.ok(!paths.includes('/stats/impact'));assert.ok(!paths.includes('/groups'));assert.ok(data.missing.includes('orders'));
});
test('L’adaptateur API admin ne fabrique pas de données de modération',async()=>{
  const {loadManagement}=await import('../src/lib/management.ts');const demo=demoSnapshot();openSession({...demoLogin('admin','demo'),token:'admin-jwt'});
  globalThis.fetch=async(url)=>{const path=new URL(url).pathname;const payload=path==='/stats/impact'?demo.impact:path==='/groups'?[{id:1}]:path==='/groups/1'?demo.groups[0]:path==='/products'?[{id:1}]:path==='/products/1'?{...demo.products[0],merchant_name:'Agro-Intrants Zio',merchant_location:'Tsévié',open_groups:[]}:null;assert.notEqual(payload,null);return new Response(JSON.stringify(payload),{status:200});};
  const data=await loadManagement();assert.equal(data.users.length,0);assert.equal(data.orders.length,0);assert.equal(data.impact.community_savings,438000);assert.ok(data.missing.includes('all-products'));
});
test('Un 401 API ferme la session et ne bascule jamais sur des données de démonstration',async()=>{
  const {api}=await import('../src/lib/api/client.ts');const {getSession}=await import('../src/lib/session.ts');openSession({...demoLogin('admin','demo'),token:'expired-jwt'});
  globalThis.fetch=async()=>new Response('{}',{status:401});await assert.rejects(()=>api('/auth/me'),/Session expirée/);assert.equal(getSession(),null);
});
