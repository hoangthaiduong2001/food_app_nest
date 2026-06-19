// Mock @sparticuz/chromium for Jest e2e
const chromium = {
  args: ['--no-sandbox'],
  executablePath: jest.fn().mockResolvedValue('/usr/bin/chromium'),
  headless: true,
};

module.exports = chromium;
module.exports.default = chromium;
