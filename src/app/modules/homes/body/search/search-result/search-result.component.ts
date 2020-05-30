import {
  Component,
  OnInit,
  // ChangeDetectorRef,
  // Input,
  // Inject,
  // Output
} from "@angular/core";
import { Router } from "@angular/router";
import { ElasticsearchService } from "../service/elasticsearch-service/elasticsearch.service";
import { ArticleSource } from "../article/article.interface";
import { Subscription } from "rxjs";
// import { Observable, of } from "rxjs";
import { IdControlService } from "../service/id-control-service/id-control.service";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { DocumentService } from "../service/document/document.service";

import { IpService } from "src/app/ip.service";
import { RecomandationService } from "../service/recommandation-service/recommandation.service";
import { EPAuthService } from '../../../../core/componets/membership/auth.service';
import { EventService } from "../../../../core/componets/membership/event.service";
import { DatabaseService } from "../../../../core/componets/database/database.service";


@Component({
  selector: "app-search-result",
  templateUrl: "./search-result.component.html",
  styleUrls: ["./search-result.component.less"]
})
export class SearchResultComponent implements OnInit {
  //Flask data
  // private BASE_URL: string = "http://localhost:5000/keywordGraph";
  // serverData: JSON;
  // private RCMD_URL: string = "http://localhost:5000/rcmd";
  // private static readonly INDEX = "nkdb";
  // private static readonly TYPE = "nkdb";
  // private queryText = "";
  // private lastKeypress = 0;
  // private thisURL: string = "http://localhost:4200/homes/searchResult";

  // private fileDir: string =
  //   "assets//homes_search_result_wordcloud/tfidfData.json";
  public relatedKeywords = [];
  private RCMD_URL: string = this.ipService.getUserServerIp() + ":5000/rcmd";
  private searchResultIdList: string[] = [];
  private keepIdList : string [] = [];
  private relatedDocs: {}[] = [];
  private isSearchLoaded: boolean = false;
  private isRelatedLoaded: boolean = true;//going to be removed
  private isKeyLoaded: boolean = false;
  private headers: HttpHeaders = new HttpHeaders({
    "Content-Type": "application/json"
  });
  private articleSources: ArticleSource[];
  // private docId: string;
  // private isConnected = false;
  // private status: string;
  private subscription: Subscription;
  private searchKeyword: string;
  // private isToggleRelated: boolean
  private relateToggle: Array<boolean>;
  // private userHistory: [] = [];
  private isLogStat: Number = 0;

  queryText: string;

  constructor(
    private auth: EPAuthService,
    private evtSvs: EventService,
    private rcmd: RecomandationService,
    private ipService: IpService,
    private idControl: IdControlService,
    public _router: Router,
    private http: HttpClient,
    private es: ElasticsearchService, //private cd: ChangeDetectorRef.
    private db: DatabaseService,
    private docControl : DocumentService
  ) {
    // this.isConnected = false;
    this.subscription = this.es.articleInfo$.subscribe(info => {
      this.articleSources = info;
      // //console.log(info)
    });
  }

  ngOnInit() {
    if (this.ipService.getUserServerIp() == this.ipService.getDevIp()) {
      if (this.es.getKeyword() == undefined) {
        this.es.setKeyword("북한산");
        this.queryText = "북한산";
      }
    }
    // this.idControl.clearAll();
    //console.log(this.evtSvs.getSrchHst());
    this.loadResultPage();
    this.isLogStat = this.auth.getLogInStat()
  }

  //Get result from flask
  freqAnalysis() {
    this.searchKeyword = this.es.getKeyword();
    this._router.navigateByUrl("search/freqAnalysis");
  }

  // private flags = []
  boxChange(i){
    let idx = this.keepIdList.indexOf(this.searchResultIdList[i]);
    idx != undefined ? 
      this.keepIdList.push(this.searchResultIdList[i]) : 
      this.keepIdList.splice(idx,1);
  }

  keepMyDoc() {
    ////console.log("id lists: ", this.searchResultIdList);
    this.auth.addMyDoc(this.keepIdList).then(()=>{
      alert("문서가 나의 문서함에 저장되었어요.")
    });
    // this.idControl.clearAll();

  }


  navToDocDetail() {
    this._router.navigateByUrl("search/DocDetail");
  }

  setThisDoc(idx: number) {
    this.idControl.setIdChosen(this.relatedDocs[idx]["id"]);
    this.navToDocDetail();
  }
  tgglRelated(i: number) {
    //console.log("tgglRelated")
    this.loadRelatedDocs(i); //load from flask
    this.relateToggle[i] = !this.relateToggle[i];
  }


  loadRelatedDocs(idx: number) {
    this.db.getRelatedDocs(this.searchResultIdList[idx]).then(res => {
      this.relatedDocs = res as [];
      console.log("from db : ",res)
    });
    // this.db.getRcmdTable(this.searchResultIdList[idx]).then(_rcmdIdsRes => {
    //   console.log("rcmdRes:",_rcmdIdsRes)
    //   let rcmdIds = _rcmdIdsRes[0]["rcmd"];
    //   this.docControl.convertID2Title(rcmdIds as string[]).then(_titlesRes => {
    //     console.log("rcmdRes:",rcmdIds)

    //     let titles = _titlesRes as []
        
    //     let i = 0;
    //     this.relatedDocs = titles.map(t => {
    //       i++;
    //       return { "id": rcmdIds[i], "title": t };
    //     })


    //     console.log("relatedDocs:",this.relatedDocs);
    //   })
    //   // }
    // });
  }

  private keywords: any[] = [];
  //aync가 의미하듯이, 비공기의 범위는 해당 함수까지만 이다.
  //toPromise도 비동기이다. toPromise 혹은 subscribe을 만나면, 비동기는 비동기대로 하고, 나머지는 건너뛴다.
  /***
   * A()
   * new Promise(r()=>B();...).then(C();)
   * D();
   * E();
   *
   * 이렇게 되어 있다면
   * A  -> B -> C
   *    -> D -> E
   * 이렇게 병렬적으로 실행된다.
   * 멀티프로세싱 혹은 시리즈 프로세싱...
   */
  loadKeywords() {
    // console.log("loadKeywords : " ,this.searchResultIdList)
    this.db.getTfidfValue(this.searchResultIdList).then(res => {
      // console.log(res)
      let data = res as []
      // console.log("loadkeywords : ", data)
      for (let n = 0; n < data.length; n++) {
        let tfVal = data[n]["tfidf"] as [];
        // console.log(tfVal)
        this.keywords.push(tfVal)
        this.relatedKeywords = this.relatedKeywords.concat(tfVal)
      }
    })
    // //console.log("keywords : ",this.keywords)
    this.isKeyLoaded = true;
  }



  relatedSearch(keyword: string) {
    this.es.setKeyword(keyword);
    this.queryText = keyword;
    this.auth.addSrchHst(this.queryText);

    this.loadResultPage();
  }

  loadSearchResult() {
    // //console.log("loadSearchResult");

    return new Promise(resolve => {
      this.es.articleInfo$.subscribe(articles => {
        this.articleSources = articles;
        this.isSearchLoaded = true;
        resolve();
      });
    });
  }

  createIdTable() {
    let temp = this.articleSources as []; //검색된 데이터들을 받음
    this.relateToggle = []; //연관 문서 여닫는 버튼 토글 초기화
    for (var i in temp) {
      this.searchResultIdList[i] = temp[i]["_id"];
      this.relateToggle.push(false);
    }
  }

  async loadResultPage() {
    this.isSearchLoaded = false;
    this.isKeyLoaded = false;
    this.isRelatedLoaded = true;//plan to be removed

    this.idControl.clearIdList();
    this.searchResultIdList = [];
    this.keepIdList = [];
    let queryText = this.es.getKeyword();
    this.es.fullTextSearch("post_body", queryText); //검색 후 articlesource에 저장되어 있다.


    //검색한 결과 호출하는 함수를 따로 만들어도 괜찮을 듯.
    await this.loadSearchResult();
    this.createIdTable();
    this.loadKeywords();
  }
}
