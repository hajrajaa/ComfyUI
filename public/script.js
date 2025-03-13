async function submitForm() {
    // Left Panel: Models & KSampler values
    const checkpoint = document.getElementById('checkpoint').value;
    const vae = document.getElementById('vae').value;
    const sampler = document.getElementById('sampler').value;
    const schedular = document.getElementById('schedular').value;
    const seed = document.getElementById('seed').value;
    const steps = document.getElementById('steps').value;
    const cfg = document.getElementById('cfg').value;
    const denoise = document.getElementById('denoise').value;
    const controlAfterGenerate = document.getElementById('control_after_generate').value;
  
    // Middle Panel: Prompts and image settings
    const prompt = document.getElementById('prompt').value;
    const negativePrompt = document.getElementById('negative_prompt').value;
    const imageWidth = document.getElementById('image_width').value;
    const imageHeight = document.getElementById('image_height').value;
    const batchSize = document.getElementById('batch_size').value;
    
    // File input for the init image
    const initImageInput = document.getElementById('init_image');
    const initImageFile = initImageInput.files[0];
  
    // Build the FormData object to send all values
    const formData = new FormData();
    formData.append('checkpoint', checkpoint);
    formData.append('vae', vae);
    formData.append('sampler', sampler);
    formData.append('schedular', schedular);
    formData.append('seed', seed);
    formData.append('steps', steps);
    formData.append('cfg', cfg);
    formData.append('denoise', denoise);
    formData.append('control_after_generate', controlAfterGenerate);
    formData.append('prompt', prompt);
    formData.append('negative_prompt', negativePrompt);
    formData.append('image_width', imageWidth);
    formData.append('image_height', imageHeight);
    formData.append('batch_size', batchSize);
    
    // Only append the image if one is provided
    if (initImageFile) {
      formData.append('init_image', initImageFile);
    }
  
    try {
      // Send the POST request to your server endpoint
      const response = await fetch('/generate_image', {
        method: 'POST',
        body: formData
      });
  
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
  
      // Parse the response JSON
      const data = await response.json();
  
      // Update the result image using the base64 string from the server
      const base64Image = data.image;
      document.getElementById('result-img').src = 'data:image/png;base64,' + base64Image;
    } catch (error) {
      console.error('Error generating image:', error);
    }
  }
  