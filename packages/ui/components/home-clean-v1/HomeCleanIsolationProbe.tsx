import styles from "./HomeCleanIsolationProbe.module.css";

const EMPTY_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function HomeCleanIsolationProbe() {
  return (
    <section className={styles.section}>
      <h1 className={styles.title}>새 홈 자리</h1>
      <p className={styles.body}>
        기존 홈 뼈대 없이 이 자리에 새 화면을 얹습니다.
      </p>
      <article className={styles.slot}>
        <p>자리 칸</p>
      </article>
      <p>
        <button className={styles.action} type="button">
          확인
        </button>
        <a className={styles.link} href="/">
          처음으로
        </a>
      </p>
      <img
        className={styles.figure}
        src={EMPTY_PIXEL}
        width={1}
        height={1}
        alt=""
      />
    </section>
  );
}
