async function main() {
  try {
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    console.log('Login response:', loginData.user);
    const token = loginData.token;

    const prodRes = await fetch('http://localhost:3001/api/admin/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Admin products status:', prodRes.status);
    const prods = await prodRes.json();
    console.log('Admin products count:', Array.isArray(prods) ? prods.length : prods);
    if (Array.isArray(prods)) {
      prods.forEach(p => console.log(`- [${p.id}] ${p.name} (Rp ${p.price}, stok: ${p.stock})`));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
main();
