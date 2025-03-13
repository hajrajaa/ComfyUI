const express=require('express');
const app=express();
const port=3000;


// For parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({extended:true}));


// For serving static files
app.use(express.static('public'));

// Example route for generating the image
app.post('/generate_image', (req, res) => {
    // In a real setup, you'd parse the form data, call ComfyUI or a Python script here.
  
    // For now, just return a dummy base64 string to show the flow works.
    // e.g. a 1x1 black pixel in base64
    const dummyImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAAAAwAAf4em1QAAAABJRU5ErkJggg==';
  
    return res.json({ image: dummyImageBase64 });
  });


// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);

});

