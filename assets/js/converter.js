/* PDF upload/conversion UI */
const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const chooseBtn = document.getElementById('chooseBtn');
    const selectedFile = document.getElementById('selectedFile');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFile = document.getElementById('removeFile');
    const convertBtn = document.getElementById('convertBtn');
    const toast = document.getElementById('toast');

    let currentFile = null;

    const formatBytes = (bytes) => {
      if (!bytes) return '0 B';
      const units = ['B','KB','MB','GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
    };

    const showToast = (message) => {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2800);
    };

    const setFile = (file) => {
      if (!file) return;
      const looksPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!looksPdf) {
        showToast('Please choose a PDF file.');
        return;
      }
      currentFile = file;
      fileName.textContent = file.name;
      fileSize.textContent = formatBytes(file.size);
      selectedFile.classList.add('show');
      convertBtn.disabled = false;
    };

    chooseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') fileInput.click();
    });
    fileInput.addEventListener('change', () => setFile(fileInput.files[0]));

    ['dragenter','dragover'].forEach(event => {
      dropZone.addEventListener(event, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag');
      });
    });
    ['dragleave','drop'].forEach(event => {
      dropZone.addEventListener(event, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag');
      });
    });
    dropZone.addEventListener('drop', (e) => setFile(e.dataTransfer.files[0]));

    removeFile.addEventListener('click', () => {
      currentFile = null;
      fileInput.value = '';
      selectedFile.classList.remove('show');
      convertBtn.disabled = true;
    });

    convertBtn.addEventListener('click', () => {
      if (!currentFile) return;
      showToast('UI prototype only — connect this button to your conversion API.');
    });
