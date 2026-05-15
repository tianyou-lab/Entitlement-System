#include "entitlement/license_client.hpp"

#include <openssl/evp.h>
#include <openssl/hmac.h>

#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <random>
#include <sstream>
#include <stdexcept>
#include <utility>

namespace entitlement {
namespace {

std::string shellQuote(const std::string& value) {
  std::string quoted = "'";
  for (char ch : value) {
    if (ch == '\'') quoted += "'\\''";
    else quoted += ch;
  }
  quoted += "'";
  return quoted;
}

LicenseResponse runCurl(const std::string& command) {
  FILE* pipe = popen(command.c_str(), "r");
  if (!pipe) throw std::runtime_error("failed to run curl");

  std::string output;
  char buffer[4096];
  while (fgets(buffer, sizeof(buffer), pipe)) output += buffer;
  const int rc = pclose(pipe);

  LicenseResponse response;
  const auto marker = output.rfind("\nHTTP_STATUS:");
  if (marker != std::string::npos) {
    response.body = output.substr(0, marker);
    response.httpStatus = std::atoi(output.substr(marker + 13).c_str());
  } else {
    response.body = output;
  }
  response.code = extractJsonString(response.body, "code");
  response.message = extractJsonString(response.body, "message");
  response.leaseToken = extractJsonString(response.body, "leaseToken");
  response.ok = rc == 0 && response.httpStatus >= 200 && response.httpStatus < 300 && response.code == "OK";
  return response;
}

}  // namespace

LicenseClient::LicenseClient(std::string apiBaseUrl, std::string productCode)
    : apiBaseUrl_(std::move(apiBaseUrl)), productCode_(std::move(productCode)) {
  while (!apiBaseUrl_.empty() && apiBaseUrl_.back() == '/') apiBaseUrl_.pop_back();
}

LicenseClient::LicenseClient(std::string apiBaseUrl, std::string productCode, std::string requestSigningSecret)
    : LicenseClient(std::move(apiBaseUrl), std::move(productCode)) {
  requestSigningSecret_ = std::move(requestSigningSecret);
}

LicenseResponse LicenseClient::activate(const std::string& licenseKey, const DeviceInfo& device) const {
  std::ostringstream body;
  body << "{\"device\":{\"appVersion\":\"" << jsonEscape(device.appVersion)
       << "\",\"deviceCode\":\"" << jsonEscape(device.deviceCode)
       << "\",\"deviceName\":\"" << jsonEscape(device.deviceName)
       << "\",\"fingerprintHash\":\"" << jsonEscape(device.fingerprintHash)
       << "\",\"hardwareSummary\":{}"
       << ",\"osType\":\"" << jsonEscape(device.osType)
       << "\",\"osVersion\":\"" << jsonEscape(device.osVersion)
       << "\"},\"licenseKey\":\"" << jsonEscape(licenseKey)
       << "\",\"productCode\":\"" << jsonEscape(productCode_) << "\"}";
  return post("/api/v1/license/activate", body.str());
}

LicenseResponse LicenseClient::verify(const std::string& leaseToken, const std::string& deviceCode, const std::string& appVersion) const {
  std::ostringstream body;
  body << "{\"appVersion\":\"" << jsonEscape(appVersion)
       << "\",\"deviceCode\":\"" << jsonEscape(deviceCode)
       << "\",\"leaseToken\":\"" << jsonEscape(leaseToken)
       << "\",\"productCode\":\"" << jsonEscape(productCode_) << "\"}";
  return post("/api/v1/license/verify", body.str());
}

LicenseResponse LicenseClient::heartbeat(const std::string& leaseToken, const std::string& deviceCode, const std::string& appVersion) const {
  std::ostringstream body;
  body << "{\"appVersion\":\"" << jsonEscape(appVersion)
       << "\",\"deviceCode\":\"" << jsonEscape(deviceCode)
       << "\",\"leaseToken\":\"" << jsonEscape(leaseToken)
       << "\",\"productCode\":\"" << jsonEscape(productCode_)
       << "\",\"runtime\":{}}";
  return post("/api/v1/license/heartbeat", body.str());
}

LicenseResponse LicenseClient::deactivate(const std::string& licenseKey, const std::string& deviceCode) const {
  std::ostringstream body;
  body << "{\"deviceCode\":\"" << jsonEscape(deviceCode)
       << "\",\"licenseKey\":\"" << jsonEscape(licenseKey)
       << "\",\"productCode\":\"" << jsonEscape(productCode_) << "\"}";
  return post("/api/v1/license/deactivate", body.str());
}

LicenseResponse LicenseClient::versionPolicy() const {
  return get("/api/v1/version/policy?productCode=" + productCode_);
}

LicenseResponse LicenseClient::post(const std::string& path, const std::string& body) const {
  const std::string command = "curl -sS -X POST -H 'content-type: application/json' " + signatureHeaders("POST", path, body) + " --data " + shellQuote(body) + " -w '\\nHTTP_STATUS:%{http_code}' " + shellQuote(apiBaseUrl_ + path);
  return runCurl(command);
}

LicenseResponse LicenseClient::get(const std::string& path) const {
  const std::string command = "curl -sS " + signatureHeaders("GET", path, "{}") + " -w '\\nHTTP_STATUS:%{http_code}' " + shellQuote(apiBaseUrl_ + path);
  return runCurl(command);
}

std::string LicenseClient::signatureHeaders(const std::string& method, const std::string& path, const std::string& body) const {
  if (requestSigningSecret_.empty()) return "";

  const auto now = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
  std::random_device randomDevice;
  std::mt19937_64 generator(randomDevice());
  std::ostringstream nonce;
  nonce << std::hex << now << generator();

  const std::string timestamp = std::to_string(now);
  const std::string nonceValue = nonce.str();
  const std::string payload = method + "\n" + path + "\n" + timestamp + "\n" + nonceValue + "\n" + body;
  const std::string signature = hmacSha256Base64Url(requestSigningSecret_, payload);

  return "-H " + shellQuote("x-entitlement-timestamp: " + timestamp) +
         " -H " + shellQuote("x-entitlement-nonce: " + nonceValue) +
         " -H " + shellQuote("x-entitlement-signature: " + signature);
}

std::string jsonEscape(const std::string& value) {
  std::string escaped;
  for (char ch : value) {
    switch (ch) {
      case '\\': escaped += "\\\\"; break;
      case '"': escaped += "\\\""; break;
      case '\n': escaped += "\\n"; break;
      case '\r': escaped += "\\r"; break;
      case '\t': escaped += "\\t"; break;
      default: escaped += ch;
    }
  }
  return escaped;
}

std::string extractJsonString(const std::string& body, const std::string& key) {
  const std::string needle = "\"" + key + "\":";
  const auto keyPos = body.find(needle);
  if (keyPos == std::string::npos) return "";
  auto valuePos = body.find('"', keyPos + needle.size());
  if (valuePos == std::string::npos) return "";
  ++valuePos;
  std::string value;
  bool escaped = false;
  for (auto i = valuePos; i < body.size(); ++i) {
    const char ch = body[i];
    if (escaped) {
      value += ch;
      escaped = false;
      continue;
    }
    if (ch == '\\') {
      escaped = true;
      continue;
    }
    if (ch == '"') break;
    value += ch;
  }
  return value;
}

std::string hmacSha256Base64Url(const std::string& secret, const std::string& payload) {
  unsigned char digest[EVP_MAX_MD_SIZE];
  unsigned int digestLength = 0;
  HMAC(EVP_sha256(),
       secret.data(),
       static_cast<int>(secret.size()),
       reinterpret_cast<const unsigned char*>(payload.data()),
       payload.size(),
       digest,
       &digestLength);

  std::string encoded(4 * ((digestLength + 2) / 3), '\0');
  const int encodedLength = EVP_EncodeBlock(
      reinterpret_cast<unsigned char*>(&encoded[0]),
      digest,
      static_cast<int>(digestLength));
  encoded.resize(encodedLength);
  while (!encoded.empty() && encoded.back() == '=') encoded.pop_back();
  for (char& ch : encoded) {
    if (ch == '+') ch = '-';
    if (ch == '/') ch = '_';
  }
  return encoded;
}

}  // namespace entitlement
