document.addEventListener('DOMContentLoaded', () => {
    const dataForm = document.getElementById('dataForm');

    dataForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(dataForm);

        try {
            const response = await fetch('/', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message);
                dataForm.reset();
            } else {
                alert('Data submission failed.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
});
