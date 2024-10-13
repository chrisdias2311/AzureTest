const express = require('express');


const fs = require('fs');
const PDFDocument = require('pdfkit');
const textwrap = require('text-wrap');

const markdownIt = require('markdown-it');
const puppeteer = require('puppeteer');


const docx = require('docx');
const { JSDOM } = require('jsdom');

const app = express();
const port = 3000;









const API_KEY = "AIzaSyAGbRvDFK9HwhytwYY9613KTZTfh94GWWo"


const https = require('https');
const { GoogleAIFileManager } = require('@google/generative-ai/server'); // Adjust if necessary
const { GoogleGenerativeAI } = require('@google/generative-ai');

const fileManager = new GoogleAIFileManager(API_KEY);



// Function to download a video from a URL
const downloadVideo = (url, path) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(path);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve); // close() is async, call resolve after close completes.
            });
        }).on('error', (err) => {
            fs.unlink(path, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Failed to delete the file:', unlinkErr.message);
                }
            });
            reject(err.message);
        });
    });
};

// Function to delete the video file
const deleteVideoFile = (path) => {
    return new Promise((resolve, reject) => {
        fs.unlink(path, (err) => {
            if (err) {
                console.error('Failed to delete the local video file:', err.message);
                reject(err);
            } else {
                console.log(`Deleted local video file: ${path}`);
                resolve();
            }
        });
    });
};

// Main async function
const processVideo = async () => {
    const videoUrl = "https://firebasestorage.googleapis.com/v0/b/mood-lens.appspot.com/o/recordings%2F1728673548978.webm?alt=media&token=509eba30-450d-4259-a06b-f4b7c9a04ff5";
    const localVideoFile = "video_480.webm"; // Path to save the downloaded video

    try {
        // Download the video
        console.log("Downloading video from URL...");
        await downloadVideo(videoUrl, localVideoFile);
        console.log(`Video downloaded and saved as ${localVideoFile}`);

        // Upload the video to the model
        console.log("Uploading video...");
        const uploadResponse = await fileManager.uploadFile(localVideoFile, {
            mimeType: "video/webm",
            displayName: "Lecture Video",
        });
        console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);

        // Verify the file upload state
        let file = await fileManager.getFile(uploadResponse.file.name);
        while (file.state === "PROCESSING") {
            process.stdout.write(".");
            await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for 10 seconds
            file = await fileManager.getFile(uploadResponse.file.name);
        }

        if (file.state === "FAILED") {
            throw new Error("Video processing failed.");
        }

        console.log(`File ${file.displayName} is ready for inference as ${file.uri}`);

        // Create the prompt
        const prompt = "Please create structured notes based on the lecture video. The notes should include equations and everything.";

        // Initialize GoogleGenerativeAI with your API_KEY
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-pro",
        });

        // Make the LLM request
        console.log("Making LLM inference request...");
        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadResponse.file.mimeType,
                    fileUri: uploadResponse.file.uri,
                },
            },
            { text: prompt },
        ]);

        // Print the response
        console.log(result.response.text());
    } catch (error) {
        console.error("Error:", error);
    } finally {
        // Delete the local video file
        await deleteVideoFile(localVideoFile);
    }
};

// Execute the function
// processVideo();






app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/hello', (req, res) => {
    res.send('Hello World from route hello');
});





app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


