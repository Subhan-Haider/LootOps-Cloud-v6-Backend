const formData = new FormData();
formData.append('name', 'TestName');
formData.append('email', 'test@test.com');
formData.append('message', 'Hello World');

fetch('https://server.lootops.me/api/forms/submit/4a081b12-f895-4097-9e47-20811a185bb5', {
  method: 'POST',
  headers: {
    'Accept': 'application/json'
  },
  body: formData
}).then(r => r.text()).then(console.log).catch(console.error);
