import { Button, Result } from "antd";
import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}
    >
      <Result
        status="404"
        title="404 - 页面不存在"
        subTitle="抱歉，您访问的页面不存在或已被移动。"
        extra={[
          <Link href="/" key="home">
            <Button type="primary" key="home">
              返回首页
            </Button>
          </Link>,
        ]}
      />
    </div>
  );
}
