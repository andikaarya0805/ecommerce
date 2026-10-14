async function test() {
  const storeRes = await fetch('http://localhost:3001/api/products');
  const storeProds = await storeRes.json();
  console.log('Storefront /api/products status:', storeRes.status, 'Count:', storeProds.length);

  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const { token } = await loginRes.json();

  const adminRes = await fetch('http://localhost:3001/api/admin/products', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const adminProds = await adminRes.json();
  console.log('Admin /api/admin/products status:', adminRes.status, 'Count:', adminProds.length);

  // Test guest checkout rejection
  const guestCheckoutRes = await fetch('http://localhost:3001/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: 'prod-1', quantity: 1 }],
      customer: { name: 'Guest User', phone: '08123456789' },
      shipping: { address: 'Jl. Merdeka No. 1' }
    })
  });
  console.log('Guest checkout HTTP status (expect 401):', guestCheckoutRes.status);
  const guestJson = await guestCheckoutRes.json();
  console.log('Guest checkout error message:', guestJson.error);

  // Test auth checkout acceptance
  const authCheckoutRes = await fetch('http://localhost:3001/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      items: [{ productId: 'prod-1', quantity: 1 }],
      customer: { name: 'Admin Buyer', phone: '08123456789' },
      shipping: {
        province: 'DKI Jakarta',
        city: 'Jakarta Timur',
        district: 'Cakung',
        address: 'Bengkel Jawir Garage',
        courierName: 'JNE Express',
        courierService: 'REG',
        shippingCost: 10000
      },
      paymentMethod: 'qris'
    })
  });
  console.log('Auth checkout HTTP status (expect 200/201):', authCheckoutRes.status);
  const authJson = await authCheckoutRes.json();
  console.log('Auth checkout invoice:', authJson.invoiceNumber, 'Status:', authJson.order?.status);
}

test();
