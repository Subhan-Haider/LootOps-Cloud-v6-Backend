const formData = new FormData();
formData.append('name', 'TestName');
formData.append('email', 'test@test.com');
formData.append('message', 'Hello World');

fetch('http://localhost:5000/api/forms/submit/test-project-123', {
  method: 'POST',
  headers: {
    'Accept': 'application/json'
  },
  body: formData
}).then(r => r.text()).then(console.log).catch(console.error);
