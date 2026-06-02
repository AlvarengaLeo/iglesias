import { Icon } from '../Icon.jsx';

const PAINS = [
  'Giving tracked in spreadsheets, or not tracked at all',
  'Receipts typed and emailed by hand, one by one',
  "No website, or one you can't update yourself",
  'Supporters you mean to follow up with, but never do',
  'No idea where giving stands until year-end',
];

const BEFORE = ['Spreadsheets & paper', 'Manual receipts', 'No online giving', 'Scattered records', 'Year-end scramble'];
const AFTER = ['Automatic giving records', 'Receipts sent for you', 'Online giving, 24/7', 'One member database', 'Real-time dashboards'];

export function ProblemSolution() {
  return (
    <section className="eb-c-section eb-c-section--alt" id="why">
      <div className="eb-c-container eb-c-split">
        <div className="pp-reveal">
          <span className="eb-c-eyebrow">Sound familiar?</span>
          <h2 className="eb-c-h2">Running a church shouldn't mean juggling ten tools.</h2>
          <ul className="eb-c-pains">
            {PAINS.map((p) => (
              <li className="eb-c-pain" key={p}>
                <span className="eb-c-pain-x"><Icon name="x" size={15} /></span>{p}
              </li>
            ))}
          </ul>
          <p className="eb-c-turn">
            EB Connect brings it all together, so you spend <strong>less time on admin</strong> and more time on ministry.
          </p>
        </div>

        <div className="eb-c-baprism pp-reveal">
          <div className="eb-c-ba eb-c-ba--before">
            <div className="eb-c-ba-tag">The old way</div>
            {BEFORE.map((b) => (
              <div className="eb-c-ba-item" key={b}><Icon name="x" size={15} /> {b}</div>
            ))}
          </div>
          <div className="eb-c-ba eb-c-ba--after">
            <div className="eb-c-ba-tag">With EB Connect</div>
            {AFTER.map((a) => (
              <div className="eb-c-ba-item" key={a}><Icon name="check" size={15} /> {a}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
