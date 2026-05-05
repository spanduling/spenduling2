export const FormData = window.FormData;
export const Blob = window.Blob;
export const File = window.File;
export const formDataToBlob = async (formData) => {
    return new Response(formData).blob();
};
export default window.FormData;
