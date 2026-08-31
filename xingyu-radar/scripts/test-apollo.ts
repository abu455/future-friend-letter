import "dotenv/config";
import {
  ExternalServiceError,
  searchApollo,
} from "../src/lib/external-services";

async function main() {
  if (!process.env.APOLLO_API_KEY) {
    console.error(
      "❌ APOLLO_API_KEY 未配置。请在 .env.local 或运行环境中设置服务端密钥。",
    );
    process.exitCode = 1;
    return;
  }

  console.info("正在通过服务端请求测试 Apollo People Search…");
  try {
    const result = await searchApollo({
      person_titles: ["Production Director"],
      person_seniorities: ["director"],
      organization_locations: ["Germany"],
      organization_num_employees_ranges: ["100,500"],
      page: 1,
      per_page: 1,
    });
    console.info(
      result.empty
        ? "✅ Apollo 连接成功，当前测试条件没有结果。"
        : `✅ Apollo 连接成功，返回 ${result.people.length} 条测试结果。`,
    );
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      console.error(`❌ ${error.code}: ${error.message}`);
    } else {
      console.error("❌ Apollo 连接检测失败。");
    }
    process.exitCode = 1;
  }
}

void main();
