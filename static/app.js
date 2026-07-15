document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('pdf-upload');
    const dropText = document.getElementById('drop-text');
    
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.spinner');
    
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    const unlockForm = document.getElementById('unlock-form');
    const downloadBtn = document.getElementById('download-btn');
    const resetBtn = document.getElementById('reset-btn');

    const footerFilename = document.getElementById('footer-filename');
    const footerFilesize = document.getElementById('footer-filesize');
    
    let currentFile = null;
    let unlockedBlobUrl = null;
    let unlockedFileName = null;
    let fileCounter = 1;

    // Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files[0]);
    });

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) handleFiles(this.files[0]);
    });

    function handleFiles(file) {
        if (file.type !== "application/pdf") {
            showError("Please upload a valid PDF.");
            return;
        }

        currentFile = file;
        hideError();
        
        document.querySelector('.card-container').classList.add('has-file');
        
        dropText.textContent = file.name;
        
        let fileNumStr = fileCounter.toString().padStart(2, '0');
        footerFilename.textContent = fileNumStr;
        footerFilesize.textContent = formatBytes(file.size);
        
        passwordInput.disabled = false;
        passwordInput.focus();
        checkFormValidity();
    }

    passwordInput.addEventListener('input', checkFormValidity);

    function checkFormValidity() {
        submitBtn.disabled = !(currentFile && passwordInput.value.length > 0);
    }

    unlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentFile || !passwordInput.value) return;

        hideError();
        setLoadingState(true);

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('password', passwordInput.value);

        try {
            const response = await fetch('/api/unlock', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Decryption failed.');
            }

            const blob = await response.blob();
            if (unlockedBlobUrl) URL.revokeObjectURL(unlockedBlobUrl);
            unlockedBlobUrl = URL.createObjectURL(blob);
            unlockedFileName = `unlocked_${currentFile.name}`;

            showSuccessState();

        } catch (error) {
            showError(error.message);
        } finally {
            setLoadingState(false);
        }
    });

    downloadBtn.addEventListener('click', () => {
        if (!unlockedBlobUrl) return;
        
        // Trigger download animation
        document.querySelector('.card-container').classList.add('downloading');
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = unlockedBlobUrl;
        a.download = unlockedFileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
        
        // Reset downloading state after animation
        setTimeout(() => {
            document.querySelector('.card-container').classList.remove('downloading');
        }, 1000);
    });

    resetBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        dropText.textContent = 'Click or drag PDF here';
        passwordInput.value = '';
        passwordInput.disabled = true;
        hideError();
        checkFormValidity();
        
        document.querySelector('.card-container').classList.remove('has-file');
        
        submitBtn.classList.remove('hidden');
        passwordInput.parentElement.classList.remove('hidden');
        dropZone.classList.remove('hidden');
        
        downloadBtn.classList.add('hidden');
        resetBtn.classList.add('hidden');
        
        fileCounter++;
    });

    function setLoadingState(isLoading) {
        submitBtn.disabled = isLoading;
        passwordInput.disabled = isLoading;
        dropZone.style.pointerEvents = isLoading ? 'none' : 'auto';
        
        if (isLoading) {
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
            checkFormValidity();
        }
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function showSuccessState() {
        submitBtn.classList.add('hidden');
        passwordInput.parentElement.classList.add('hidden');
        dropZone.classList.add('hidden');
        
        downloadBtn.classList.remove('hidden');
        resetBtn.classList.remove('hidden');
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
});
