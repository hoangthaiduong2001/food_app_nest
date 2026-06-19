// Mock @sparticuz/chromium for Jest
const chromium = {
  args: ['--no-sandbox'],
  executablePath: jest.fn().mockResolvedValue('/usr/bin/chromium'),
  headless: true,
};

module.exports = chromium;
module.exports.default = chromium;
