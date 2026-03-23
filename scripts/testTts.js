import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import fs from 'fs';

async function testTts() {
    const client = new TextToSpeechClient();
    const text = 'tʰɒp'; // [tʰ] in top
    const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const request = {
        input: { ssml: `<speak><phoneme alphabet="ipa" ph="${escapedText}">${escapedText}</phoneme></speak>` },
        voice: { languageCode: 'en-US', name: 'en-US-Chirp3-HD-Dione' },
        audioConfig: { audioEncoding: 'MP3' },
    };

    console.log('Sending SSML:', request.input.ssml);

    try {
        const [response] = await client.synthesizeSpeech(request);
        const buffer = Buffer.from(response.audioContent);
        fs.writeFileSync('test-audio.mp3', buffer);
        console.log('Success! Saved test-audio.mp3 (size:', buffer.length, 'bytes)');
    } catch (error) {
        console.error('TTS Test Failed:', error.message);
    }
}

testTts();
